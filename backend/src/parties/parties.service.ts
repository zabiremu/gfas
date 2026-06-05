import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { Party, PartyRole } from '../entities/party.entity';
import { CreatePartyDto } from './dto/create-party.dto';
import { UpdatePartyDto } from './dto/update-party.dto';

@Injectable()
export class PartiesService {
  constructor(
    @InjectRepository(Party)
    private readonly partyRepository: Repository<Party>,
  ) {}

  async findAll(
    tenantId: string,
    query?: { role?: PartyRole; q?: string },
  ): Promise<Party[]> {
    const where: FindOptionsWhere<Party> = { tenant_id: tenantId };

    if (query?.role) {
      where.role = query.role;
    }
    if (query?.q) {
      where.name = ILike(`%${query.q}%`);
    }

    return this.partyRepository.find({
      where,
      order: { created_at: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<Party> {
    const party = await this.partyRepository.findOne({
      where: { id, tenant_id: tenantId },
    });
    if (!party) {
      throw new NotFoundException(`Party ${id} not found`);
    }
    return party;
  }

  async create(tenantId: string, dto: CreatePartyDto): Promise<Party> {
    const party = this.partyRepository.create({
      tenant_id: tenantId,
      name: dto.name,
      role: dto.role,
      address: dto.address ?? null,
      city: dto.city ?? null,
      state: dto.state ?? null,
      country: dto.country ?? null,
      postal_code: dto.postalCode ?? null,
      phone: dto.phone ?? null,
      email: dto.email ?? null,
      tax_id: dto.taxId ?? null,
    });
    return this.partyRepository.save(party);
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdatePartyDto,
  ): Promise<Party> {
    const party = await this.findOne(tenantId, id);

    if (dto.name !== undefined) party.name = dto.name;
    if (dto.role !== undefined) party.role = dto.role;
    if (dto.address !== undefined) party.address = dto.address;
    if (dto.city !== undefined) party.city = dto.city;
    if (dto.state !== undefined) party.state = dto.state;
    if (dto.country !== undefined) party.country = dto.country;
    if (dto.postalCode !== undefined) party.postal_code = dto.postalCode;
    if (dto.phone !== undefined) party.phone = dto.phone;
    if (dto.email !== undefined) party.email = dto.email;
    if (dto.taxId !== undefined) party.tax_id = dto.taxId;

    return this.partyRepository.save(party);
  }
}
