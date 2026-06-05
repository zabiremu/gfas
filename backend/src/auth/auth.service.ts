import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Tenant } from '../entities/tenant.entity';
import { User, UserRole } from '../entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const slug = await this.generateUniqueSlug(dto.tenantName);

    // Create the tenant and its first admin user atomically.
    const user = await this.userRepository.manager.transaction(
      async (manager) => {
        const tenant = manager.create(Tenant, {
          name: dto.tenantName,
          slug,
        });
        const savedTenant = await manager.save(tenant);

        const newUser = manager.create(User, {
          tenant_id: savedTenant.id,
          email: dto.email,
          password_hash: passwordHash,
          first_name: dto.firstName,
          last_name: dto.lastName,
          role: UserRole.ADMIN,
        });
        return manager.save(newUser);
      },
    );

    const { access_token } = await this.generateTokens(user);
    return {
      access_token,
      user: this.toUserResponse(user),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { access_token, refresh_token } = await this.generateTokens(user);
    return {
      access_token,
      refresh_token,
      user: this.toUserResponse(user),
    };
  }

  async generateTokens(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id,
    };

    const access_token = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn: '15m',
    });

    const refresh_token = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    return { access_token, refresh_token };
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user || !user.is_active) {
      return null;
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    return passwordMatches ? user : null;
  }

  private toUserResponse(user: User) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
      tenantId: user.tenant_id,
    };
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const base =
      name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'tenant';

    let slug = base;
    let counter = 1;
    while (
      await this.userRepository.manager.findOne(Tenant, { where: { slug } })
    ) {
      slug = `${base}-${counter++}`;
    }
    return slug;
  }
}
