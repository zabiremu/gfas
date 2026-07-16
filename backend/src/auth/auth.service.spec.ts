import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { Tenant } from '../entities/tenant.entity';
import { User, UserRole } from '../entities/user.entity';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: Partial<Record<keyof Repository<User>, jest.Mock>> & {
    manager: any;
  };
  let jwtService: { signAsync: jest.Mock };
  let configService: { getOrThrow: jest.Mock };

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
      manager: {
        transaction: jest.fn(),
        findOne: jest.fn(),
      },
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-token'),
    };
    configService = {
      getOrThrow: jest.fn((key: string) => `secret-for-${key}`),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('login', () => {
    it('throws UnauthorizedException on wrong password', async () => {
      userRepo.findOne!.mockResolvedValue({
        id: 'u1',
        is_active: true,
        password_hash: await bcrypt.hash('correct-password', 10),
      } as User);

      await expect(
        service.login({ email: 'a@b.com', password: 'wrong' } as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for an inactive user', async () => {
      userRepo.findOne!.mockResolvedValue({
        id: 'u1',
        is_active: false,
        password_hash: await bcrypt.hash('pw', 10),
      } as User);

      await expect(
        service.login({ email: 'a@b.com', password: 'pw' } as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when no user matches the email', async () => {
      userRepo.findOne!.mockResolvedValue(null);
      await expect(
        service.login({ email: 'missing@b.com', password: 'pw' } as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('issues an access_token and refresh_token on valid credentials', async () => {
      const user = {
        id: 'u1',
        email: 'a@b.com',
        role: UserRole.ADMIN,
        tenant_id: 't1',
        is_active: true,
        password_hash: await bcrypt.hash('correct-password', 10),
        first_name: 'A',
        last_name: 'B',
      } as User;
      userRepo.findOne!.mockResolvedValue(user);

      const result = await service.login({
        email: 'a@b.com',
        password: 'correct-password',
      } as any);

      expect(result.access_token).toBe('signed-token');
      expect(result.refresh_token).toBe('signed-token');
      expect(result.user).toMatchObject({ id: 'u1', email: 'a@b.com' });
    });
  });

  describe('generateTokens', () => {
    it('signs the access token with JWT_SECRET and the refresh token with JWT_REFRESH_SECRET', async () => {
      const user = {
        id: 'u1',
        email: 'a@b.com',
        role: UserRole.AGENT,
        tenant_id: 't1',
      } as User;

      await service.generateTokens(user);

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'u1', tenantId: 't1' }),
        expect.objectContaining({ secret: 'secret-for-JWT_SECRET' }),
      );
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'u1' }),
        expect.objectContaining({ secret: 'secret-for-JWT_REFRESH_SECRET' }),
      );
    });
  });

  describe('validateUser', () => {
    it('returns null when the password does not match', async () => {
      userRepo.findOne!.mockResolvedValue({
        is_active: true,
        password_hash: await bcrypt.hash('right', 10),
      } as User);
      const result = await service.validateUser('a@b.com', 'wrong');
      expect(result).toBeNull();
    });

    it('returns the user when credentials are valid', async () => {
      const user = {
        is_active: true,
        password_hash: await bcrypt.hash('right', 10),
      } as User;
      userRepo.findOne!.mockResolvedValue(user);
      const result = await service.validateUser('a@b.com', 'right');
      expect(result).toBe(user);
    });
  });

  describe('register', () => {
    it('throws ConflictException when the email is already registered', async () => {
      userRepo.findOne!.mockResolvedValue({ id: 'existing' } as User);
      await expect(
        service.register({
          email: 'taken@b.com',
          password: 'pw',
          tenantName: 'Acme',
          firstName: 'A',
          lastName: 'B',
        } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('creates a tenant and admin user in a transaction, returning an access_token', async () => {
      userRepo.findOne!.mockResolvedValue(null); // no existing user with that email
      userRepo.manager.findOne.mockResolvedValue(null); // slug is unique on first try

      const savedUser = {
        id: 'new-user',
        email: 'new@b.com',
        role: UserRole.ADMIN,
        tenant_id: 'new-tenant',
        first_name: 'New',
        last_name: 'User',
      } as User;

      userRepo.manager.transaction.mockImplementation(async (cb: any) => {
        const manager = {
          create: jest.fn((entity, data) => data),
          save: jest.fn(async (data) => {
            if (data.slug) return { id: 'new-tenant', ...data } as Tenant;
            return savedUser;
          }),
        };
        return cb(manager);
      });

      const result = await service.register({
        email: 'new@b.com',
        password: 'pw',
        tenantName: 'New Co',
        firstName: 'New',
        lastName: 'User',
      } as any);

      expect(result.access_token).toBe('signed-token');
      expect(result.user).toMatchObject({ id: 'new-user', email: 'new@b.com' });
    });
  });
});
