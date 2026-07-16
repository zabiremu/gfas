import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import {
  WarehouseEntry,
  WarehouseStatus,
} from '../entities/warehouse.entity';
import { CreateWarehouseEntryDto } from './dto/create-warehouse-entry.dto';
import { UpdateWarehouseEntryDto } from './dto/update-warehouse-entry.dto';

/** One entry in a WarehouseEntry.movement_log jsonb array. */
interface MovementLogEntry {
  step: number;
  action: string;
  location: string | null;
  time: string;
  logged_by: string;
  note?: string;
}

/** Subset of location columns used to render a human-readable location label. */
type LocationFields = {
  zone?: string | null;
  aisle?: string | null;
  rack?: string | null;
  level?: string | null;
};

@Injectable()
export class WarehouseService {
  constructor(
    @InjectRepository(WarehouseEntry)
    private readonly warehouseRepository: Repository<WarehouseEntry>,
  ) {}

  async findAll(
    tenantId: string,
    query?: { status?: WarehouseStatus; shipmentId?: string; q?: string },
  ): Promise<WarehouseEntry[]> {
    const base: FindOptionsWhere<WarehouseEntry> = { tenant_id: tenantId };
    if (query?.status) {
      base.status = query.status;
    }
    if (query?.shipmentId) {
      base.shipment_id = query.shipmentId;
    }

    // When a search term is supplied, match either customer_name OR
    // batch_number using an array of where-clauses (OR semantics).
    const where:
      | FindOptionsWhere<WarehouseEntry>
      | FindOptionsWhere<WarehouseEntry>[] = query?.q
      ? [
          { ...base, customer_name: ILike(`%${query.q}%`) },
          { ...base, batch_number: ILike(`%${query.q}%`) },
        ]
      : base;

    return this.warehouseRepository.find({
      where,
      order: { created_at: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<WarehouseEntry> {
    const entry = await this.warehouseRepository.findOne({
      where: { id, tenant_id: tenantId },
    });
    if (!entry) {
      throw new NotFoundException(`Warehouse entry ${id} not found`);
    }
    return entry;
  }

  async create(
    tenantId: string,
    userEmail: string,
    dto: CreateWarehouseEntryDto,
  ): Promise<WarehouseEntry> {
    const intakeLog: MovementLogEntry = {
      step: 1,
      action: 'RECEIVED',
      location: this.formatLocation(dto) ?? 'Receiving',
      time: new Date().toISOString(),
      logged_by: userEmail,
    };

    const entry = this.warehouseRepository.create({
      tenant_id: tenantId,
      shipment_id: dto.shipmentId ?? null,
      warehouse_id: dto.warehouseId,
      customer_name: dto.customerName,
      batch_number: dto.batchNumber,
      lot_number: dto.lotNumber ?? null,
      num_pallets: dto.numPallets,
      weight_kg: dto.weightKg,
      is_hazmat: dto.isHazmat ?? false,
      hazmat_class: dto.hazmatClass ?? null,
      hazmat_un_number: dto.hazmatUnNumber ?? null,
      zone: dto.zone ?? null,
      aisle: dto.aisle ?? null,
      rack: dto.rack ?? null,
      level: dto.level ?? null,
      temp_min: dto.tempMin ?? null,
      temp_max: dto.tempMax ?? null,
      storage_start_date: new Date(dto.storageStartDate),
      storage_end_date: dto.storageEndDate ? new Date(dto.storageEndDate) : null,
      status: WarehouseStatus.IN_STORAGE,
      movement_log: [intakeLog],
    });

    return this.warehouseRepository.save(entry);
  }

  async update(
    tenantId: string,
    id: string,
    userEmail: string,
    dto: UpdateWarehouseEntryDto,
  ): Promise<WarehouseEntry> {
    const entry = await this.findOne(tenantId, id);

    if (dto.customerName !== undefined) entry.customer_name = dto.customerName;
    if (dto.batchNumber !== undefined) entry.batch_number = dto.batchNumber;
    if (dto.lotNumber !== undefined) entry.lot_number = dto.lotNumber ?? null;
    if (dto.numPallets !== undefined) entry.num_pallets = dto.numPallets;
    if (dto.weightKg !== undefined) entry.weight_kg = dto.weightKg;
    if (dto.isHazmat !== undefined) entry.is_hazmat = dto.isHazmat;
    if (dto.hazmatClass !== undefined)
      entry.hazmat_class = dto.hazmatClass ?? null;
    if (dto.hazmatUnNumber !== undefined)
      entry.hazmat_un_number = dto.hazmatUnNumber ?? null;
    if (dto.zone !== undefined) entry.zone = dto.zone ?? null;
    if (dto.aisle !== undefined) entry.aisle = dto.aisle ?? null;
    if (dto.rack !== undefined) entry.rack = dto.rack ?? null;
    if (dto.level !== undefined) entry.level = dto.level ?? null;
    if (dto.tempMin !== undefined) entry.temp_min = dto.tempMin ?? null;
    if (dto.tempMax !== undefined) entry.temp_max = dto.tempMax ?? null;
    if (dto.storageEndDate !== undefined)
      entry.storage_end_date = dto.storageEndDate
        ? new Date(dto.storageEndDate)
        : null;

    if (dto.note) {
      entry.movement_log = this.appendLog(entry, {
        action: 'NOTE',
        location: this.formatLocation(entry),
        logged_by: userEmail,
        note: dto.note,
      });
    }

    return this.warehouseRepository.save(entry);
  }

  async release(
    tenantId: string,
    id: string,
    userId: string,
    userEmail: string,
  ): Promise<WarehouseEntry> {
    const entry = await this.findOne(tenantId, id);

    // Already released — return unchanged rather than double-logging.
    if (entry.status === WarehouseStatus.RELEASED) {
      return entry;
    }

    const now = new Date();
    entry.status = WarehouseStatus.RELEASED;
    entry.released_at = now;
    entry.released_by = userId;
    entry.storage_end_date = now;
    entry.movement_log = this.appendLog(entry, {
      action: 'RELEASED',
      location: this.formatLocation(entry),
      logged_by: userEmail,
    });

    return this.warehouseRepository.save(entry);
  }

  /** Appends a movement-log entry, auto-assigning the next step number. */
  private appendLog(
    entry: WarehouseEntry,
    fields: Omit<MovementLogEntry, 'step' | 'time'>,
  ): MovementLogEntry[] {
    const existing = (entry.movement_log ?? []) as MovementLogEntry[];
    return [
      ...existing,
      { step: existing.length + 1, time: new Date().toISOString(), ...fields },
    ];
  }

  private formatLocation(src: LocationFields): string | null {
    const parts = [
      src.zone && `Zone ${src.zone}`,
      src.aisle && `Aisle ${src.aisle}`,
      src.rack && `Rack ${src.rack}`,
      src.level && `Level ${src.level}`,
    ].filter(Boolean) as string[];
    return parts.length ? parts.join(', ') : null;
  }
}
