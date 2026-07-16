import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Warehouse } from '../entities/warehouse-facility.entity';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';

@Injectable()
export class WarehouseFacilityService {
  constructor(
    @InjectRepository(Warehouse)
    private readonly warehouseRepository: Repository<Warehouse>,
  ) {}

  async findAll(tenantId: string): Promise<Warehouse[]> {
    return this.warehouseRepository.find({
      where: { tenant_id: tenantId },
      order: { name: 'ASC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<Warehouse> {
    const warehouse = await this.warehouseRepository.findOne({
      where: { id, tenant_id: tenantId },
    });
    if (!warehouse) {
      throw new NotFoundException(`Warehouse ${id} not found`);
    }
    return warehouse;
  }

  async create(
    tenantId: string,
    dto: CreateWarehouseDto,
  ): Promise<Warehouse> {
    const warehouse = this.warehouseRepository.create({
      tenant_id: tenantId,
      name: dto.name,
      code: dto.code,
      address: dto.address ?? null,
      city: dto.city ?? null,
      state: dto.state ?? null,
      country: dto.country ?? null,
      postal_code: dto.postalCode ?? null,
      capacity_pallets: dto.capacityPallets ?? null,
      is_active: dto.isActive ?? true,
    });
    return this.warehouseRepository.save(warehouse);
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateWarehouseDto,
  ): Promise<Warehouse> {
    const warehouse = await this.findOne(tenantId, id);

    if (dto.name !== undefined) warehouse.name = dto.name;
    if (dto.code !== undefined) warehouse.code = dto.code;
    if (dto.address !== undefined) warehouse.address = dto.address ?? null;
    if (dto.city !== undefined) warehouse.city = dto.city ?? null;
    if (dto.state !== undefined) warehouse.state = dto.state ?? null;
    if (dto.country !== undefined) warehouse.country = dto.country ?? null;
    if (dto.postalCode !== undefined)
      warehouse.postal_code = dto.postalCode ?? null;
    if (dto.capacityPallets !== undefined)
      warehouse.capacity_pallets = dto.capacityPallets ?? null;
    if (dto.isActive !== undefined) warehouse.is_active = dto.isActive;

    return this.warehouseRepository.save(warehouse);
  }
}
