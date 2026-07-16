import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { RateSheetItem } from '../entities/rate-sheet-item.entity';
import { RateSheet } from '../entities/rate-sheet.entity';
import { CreateRateSheetDto } from './dto/create-rate-sheet.dto';
import { RateSheetItemInputDto } from './dto/rate-sheet-item-input.dto';
import { UpdateRateSheetItemDto } from './dto/update-rate-sheet-item.dto';
import { UpdateRateSheetDto } from './dto/update-rate-sheet.dto';

@Injectable()
export class RateSheetsService {
  constructor(
    @InjectRepository(RateSheet)
    private readonly rateSheetRepository: Repository<RateSheet>,
    @InjectRepository(RateSheetItem)
    private readonly rateSheetItemRepository: Repository<RateSheetItem>,
  ) {}

  async findAll(
    tenantId: string,
    query?: { isActive?: boolean },
  ): Promise<RateSheet[]> {
    const where: FindOptionsWhere<RateSheet> = { tenant_id: tenantId };
    if (query?.isActive !== undefined) where.is_active = query.isActive;

    return this.rateSheetRepository.find({
      where,
      relations: { items: true },
      order: { created_at: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<RateSheet> {
    const rateSheet = await this.rateSheetRepository.findOne({
      where: { id, tenant_id: tenantId },
      relations: { items: true },
    });
    if (!rateSheet) {
      throw new NotFoundException(`Rate sheet ${id} not found`);
    }
    return rateSheet;
  }

  async create(
    tenantId: string,
    dto: CreateRateSheetDto,
  ): Promise<RateSheet> {
    const rateSheet = this.rateSheetRepository.create({
      tenant_id: tenantId,
      name: dto.name,
      carrier_party_id: dto.carrierPartyId ?? null,
      mode: dto.mode,
      origin_port: dto.originPort ?? null,
      destination_port: dto.destinationPort ?? null,
      effective_from: new Date(dto.effectiveFrom),
      effective_to: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
      is_active: dto.isActive ?? true,
    });
    return this.rateSheetRepository.save(rateSheet);
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateRateSheetDto,
  ): Promise<RateSheet> {
    const rateSheet = await this.findOne(tenantId, id);

    if (dto.name !== undefined) rateSheet.name = dto.name;
    if (dto.carrierPartyId !== undefined)
      rateSheet.carrier_party_id = dto.carrierPartyId ?? null;
    if (dto.mode !== undefined) rateSheet.mode = dto.mode;
    if (dto.originPort !== undefined)
      rateSheet.origin_port = dto.originPort ?? null;
    if (dto.destinationPort !== undefined)
      rateSheet.destination_port = dto.destinationPort ?? null;
    if (dto.effectiveFrom !== undefined)
      rateSheet.effective_from = new Date(dto.effectiveFrom);
    if (dto.effectiveTo !== undefined)
      rateSheet.effective_to = dto.effectiveTo
        ? new Date(dto.effectiveTo)
        : null;
    if (dto.isActive !== undefined) rateSheet.is_active = dto.isActive;

    return this.rateSheetRepository.save(rateSheet);
  }

  async addItem(
    tenantId: string,
    rateSheetId: string,
    dto: RateSheetItemInputDto,
  ): Promise<RateSheetItem> {
    await this.findOne(tenantId, rateSheetId); // tenant-scoped existence check

    return this.rateSheetItemRepository.save(
      this.rateSheetItemRepository.create({
        rate_sheet_id: rateSheetId,
        charge_code: dto.chargeCode,
        description: dto.description,
        rate_basis: dto.rateBasis,
        rate_amount: dto.rateAmount,
        min_charge: dto.minCharge ?? null,
        currency: dto.currency ?? 'USD',
      }),
    );
  }

  async updateItem(
    tenantId: string,
    rateSheetId: string,
    itemId: string,
    dto: UpdateRateSheetItemDto,
  ): Promise<RateSheetItem> {
    await this.findOne(tenantId, rateSheetId);

    const item = await this.rateSheetItemRepository.findOne({
      where: { id: itemId, rate_sheet_id: rateSheetId },
    });
    if (!item) {
      throw new NotFoundException(`Rate sheet item ${itemId} not found`);
    }

    if (dto.chargeCode !== undefined) item.charge_code = dto.chargeCode;
    if (dto.description !== undefined) item.description = dto.description;
    if (dto.rateBasis !== undefined) item.rate_basis = dto.rateBasis;
    if (dto.rateAmount !== undefined) item.rate_amount = dto.rateAmount;
    if (dto.minCharge !== undefined) item.min_charge = dto.minCharge ?? null;
    if (dto.currency !== undefined) item.currency = dto.currency;

    return this.rateSheetItemRepository.save(item);
  }

  async removeItem(
    tenantId: string,
    rateSheetId: string,
    itemId: string,
  ): Promise<void> {
    await this.findOne(tenantId, rateSheetId);
    await this.rateSheetItemRepository.delete({
      id: itemId,
      rate_sheet_id: rateSheetId,
    });
  }
}
