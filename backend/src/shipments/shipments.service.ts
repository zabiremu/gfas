import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, In, Repository } from 'typeorm';
import {
  Shipment,
  ShipmentDirection,
  ShipmentMode,
  ShipmentStatus,
} from '../entities/shipment.entity';
import { CargoItem } from '../entities/cargo-item.entity';
import { PartyRole } from '../entities/party.entity';
import { ShipmentParty } from '../entities/shipment-party.entity';
import { TrackingEvent } from '../entities/tracking-event.entity';
import { AttachShipmentPartyDto } from './dto/attach-shipment-party.dto';
import { CargoItemInputDto } from './dto/cargo-item-input.dto';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { CreateTrackingEventDto } from './dto/create-tracking-event.dto';
import { UpdateCargoItemDto } from './dto/update-cargo-item.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';

@Injectable()
export class ShipmentsService {
  constructor(
    @InjectRepository(Shipment)
    private readonly shipmentRepository: Repository<Shipment>,
    @InjectRepository(TrackingEvent)
    private readonly trackingEventRepository: Repository<TrackingEvent>,
    @InjectRepository(ShipmentParty)
    private readonly shipmentPartyRepository: Repository<ShipmentParty>,
    @InjectRepository(CargoItem)
    private readonly cargoItemRepository: Repository<CargoItem>,
  ) {}

  async findAll(
    tenantId: string,
    query?: {
      status?: ShipmentStatus;
      mode?: ShipmentMode;
      direction?: ShipmentDirection;
      q?: string;
    },
  ): Promise<Shipment[]> {
    const base: FindOptionsWhere<Shipment> = { tenant_id: tenantId };
    if (query?.status) {
      base.status = query.status;
    }
    if (query?.mode) {
      base.mode = query.mode;
    }
    if (query?.direction) {
      base.direction = query.direction;
    }

    // Goods-description search moved to cargo_items with the cargo-line-items
    // refactor; matching against it here would need a join via query builder,
    // so search is shipment_number-only for now.
    const where: FindOptionsWhere<Shipment> = query?.q
      ? { ...base, shipment_number: ILike(`%${query.q}%`) }
      : base;

    const shipments = await this.shipmentRepository.find({
      where,
      // Cargo items are loaded here too (not just findOne) so list views
      // can show hazmat status without a follow-up request per row.
      relations: { cargoItems: true },
      order: { created_at: 'DESC' },
    });
    await this.attachPrimaryParties(tenantId, shipments);
    return shipments;
  }

  async findOne(tenantId: string, id: string): Promise<Shipment> {
    const shipment = await this.shipmentRepository.findOne({
      where: { id, tenant_id: tenantId },
      relations: {
        documents: true,
        trackingEvents: true,
        cargoItems: true,
      },
    });
    if (!shipment) {
      throw new NotFoundException(`Shipment ${id} not found`);
    }
    await this.attachPrimaryParties(tenantId, [shipment]);
    return shipment;
  }

  // Populates the (non-persisted) shipper/consignee/notifyParty fields on
  // each shipment from shipment_parties instead of the legacy shipper_id/
  // consignee_id/notify_party_id FK columns, which are no longer read from.
  // Kept as the same property names for backward-compatible API responses;
  // GET /shipments/:id/parties is the source of truth for multi-party roles.
  private async attachPrimaryParties(
    tenantId: string,
    shipments: Shipment[],
  ): Promise<void> {
    if (shipments.length === 0) return;

    const links = await this.shipmentPartyRepository.find({
      where: {
        tenant_id: tenantId,
        shipment_id: In(shipments.map((s) => s.id)),
        is_primary: true,
      },
      relations: { party: true },
    });

    const byShipment = new Map<string, ShipmentParty[]>();
    for (const link of links) {
      const list = byShipment.get(link.shipment_id) ?? [];
      list.push(link);
      byShipment.set(link.shipment_id, list);
    }

    for (const shipment of shipments) {
      const shipmentLinks = byShipment.get(shipment.id) ?? [];
      shipment.shipper =
        shipmentLinks.find((l) => l.role === PartyRole.SHIPPER)?.party ??
        null;
      shipment.consignee =
        shipmentLinks.find((l) => l.role === PartyRole.CONSIGNEE)?.party ??
        null;
      shipment.notifyParty =
        shipmentLinks.find((l) => l.role === PartyRole.NOTIFY_PARTY)
          ?.party ?? null;
    }
  }

  async create(
    tenantId: string,
    userId: string,
    dto: CreateShipmentDto,
  ): Promise<Shipment> {
    const shipmentNumber = await this.generateShipmentNumber();

    const shipment = this.shipmentRepository.create({
      tenant_id: tenantId,
      created_by: userId,
      shipment_number: shipmentNumber,
      status: ShipmentStatus.DRAFT,
      mode: dto.mode,
      direction: dto.direction,
      origin_port: dto.originPort,
      destination_port: dto.destinationPort,
      etd: dto.etd ? new Date(dto.etd) : null,
      eta: dto.eta ? new Date(dto.eta) : null,
      vessel_name: dto.vesselName ?? null,
      flight_number: dto.flightNumber ?? null,
      mawb_number: dto.mawbNumber ?? null,
    });

    const saved = await this.shipmentRepository.save(shipment);
    await this.setPrimaryParties(tenantId, saved.id, {
      shipperId: dto.shipperId ?? null,
      consigneeId: dto.consigneeId ?? null,
      notifyPartyId: dto.notifyPartyId ?? null,
    });

    const cargoItems = this.resolveCargoItemsInput(dto);
    if (cargoItems.length > 0) {
      await this.replaceCargoItems(tenantId, saved.id, cargoItems);
    }

    await this.attachPrimaryParties(tenantId, [saved]);
    saved.cargoItems = await this.cargoItemRepository.find({
      where: { shipment_id: saved.id },
    });
    return saved;
  }

  // Prefers the `cargoItems` array; falls back to the deprecated flat
  // fields (a single line) for clients not yet updated to send the array.
  private resolveCargoItemsInput(dto: CreateShipmentDto): CargoItemInputDto[] {
    if (dto.cargoItems && dto.cargoItems.length > 0) {
      return dto.cargoItems;
    }
    if (dto.goodsDescription) {
      return [
        {
          goodsDescription: dto.goodsDescription,
          hsCode: dto.hsCode,
          countryOfOrigin: dto.countryOfOrigin,
          grossWeightKg: dto.grossWeightKg ?? 0,
          volumeCbm: dto.volumeCbm,
          numPackages: dto.numPackages ?? 0,
          packageType: dto.packageType ?? 'Other',
          declaredValueUsd: dto.declaredValueUsd,
          isHazmat: dto.isHazmat,
          hazmatUnNumber: dto.hazmatUnNumber,
          hazmatProperShippingName: dto.hazmatProperShippingName,
          hazmatClass: dto.hazmatClass,
          hazmatPackingGroup: dto.hazmatPackingGroup,
        },
      ];
    }
    return [];
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateShipmentDto,
  ): Promise<Shipment> {
    const shipment = await this.shipmentRepository.findOne({
      where: { id, tenant_id: tenantId },
    });
    if (!shipment) {
      throw new NotFoundException(`Shipment ${id} not found`);
    }

    if (dto.mode !== undefined) shipment.mode = dto.mode;
    if (dto.direction !== undefined) shipment.direction = dto.direction;
    if (dto.status !== undefined) shipment.status = dto.status;
    if (dto.originPort !== undefined) shipment.origin_port = dto.originPort;
    if (dto.destinationPort !== undefined)
      shipment.destination_port = dto.destinationPort;
    if (dto.etd !== undefined) shipment.etd = dto.etd ? new Date(dto.etd) : null;
    if (dto.eta !== undefined) shipment.eta = dto.eta ? new Date(dto.eta) : null;
    if (dto.vesselName !== undefined) shipment.vessel_name = dto.vesselName;
    if (dto.flightNumber !== undefined)
      shipment.flight_number = dto.flightNumber;
    if (dto.mawbNumber !== undefined) shipment.mawb_number = dto.mawbNumber;

    const saved = await this.shipmentRepository.save(shipment);
    if (
      dto.shipperId !== undefined ||
      dto.consigneeId !== undefined ||
      dto.notifyPartyId !== undefined
    ) {
      await this.setPrimaryParties(tenantId, saved.id, {
        shipperId: dto.shipperId,
        consigneeId: dto.consigneeId,
        notifyPartyId: dto.notifyPartyId,
      });
    }

    if (dto.cargoItems && dto.cargoItems.length > 0) {
      // Explicit array replaces the shipment's full cargo-line set.
      await this.replaceCargoItems(tenantId, saved.id, dto.cargoItems);
    } else if (this.hasFlatCargoField(dto)) {
      // Deprecated flat-field fallback: patch just the primary line.
      await this.patchPrimaryCargoItem(tenantId, saved.id, dto);
    }

    await this.attachPrimaryParties(tenantId, [saved]);
    saved.cargoItems = await this.cargoItemRepository.find({
      where: { shipment_id: saved.id },
    });
    return saved;
  }

  private hasFlatCargoField(dto: UpdateShipmentDto): boolean {
    return [
      dto.goodsDescription,
      dto.hsCode,
      dto.countryOfOrigin,
      dto.grossWeightKg,
      dto.volumeCbm,
      dto.numPackages,
      dto.packageType,
      dto.declaredValueUsd,
      dto.isHazmat,
      dto.hazmatUnNumber,
      dto.hazmatProperShippingName,
      dto.hazmatClass,
      dto.hazmatPackingGroup,
    ].some((v) => v !== undefined);
  }

  // Replaces every cargo_items row for a shipment with the given set — used
  // when a client sends the full `cargoItems` array (create, or an explicit
  // update). The first item is marked primary.
  private async replaceCargoItems(
    tenantId: string,
    shipmentId: string,
    items: CargoItemInputDto[],
  ): Promise<void> {
    await this.cargoItemRepository.delete({ shipment_id: shipmentId });
    await this.cargoItemRepository.save(
      items.map((item, index) =>
        this.cargoItemRepository.create({
          tenant_id: tenantId,
          shipment_id: shipmentId,
          is_primary: index === 0,
          ...this.toCargoItemColumns(item),
        }),
      ),
    );
  }

  // Deprecated flat-field fallback: patches (or creates) just the primary
  // cargo line, leaving any other lines untouched.
  private async patchPrimaryCargoItem(
    tenantId: string,
    shipmentId: string,
    fields: Partial<CargoItemInputDto>,
  ): Promise<void> {
    const existing = await this.cargoItemRepository.findOne({
      where: { shipment_id: shipmentId, is_primary: true },
    });
    if (existing) {
      Object.assign(existing, this.toCargoItemColumns(fields, existing));
      await this.cargoItemRepository.save(existing);
    } else {
      await this.cargoItemRepository.save(
        this.cargoItemRepository.create({
          tenant_id: tenantId,
          shipment_id: shipmentId,
          is_primary: true,
          ...this.toCargoItemColumns({
            goodsDescription: fields.goodsDescription ?? '',
            grossWeightKg: fields.grossWeightKg ?? 0,
            numPackages: fields.numPackages ?? 0,
            packageType: fields.packageType ?? 'Other',
            ...fields,
          }),
        }),
      );
    }
  }

  private toCargoItemColumns(
    item: Partial<CargoItemInputDto>,
    base?: CargoItem,
  ) {
    return {
      goods_description: item.goodsDescription ?? base?.goods_description,
      hs_code: item.hsCode ?? base?.hs_code ?? null,
      country_of_origin: item.countryOfOrigin ?? base?.country_of_origin ?? null,
      gross_weight_kg: item.grossWeightKg ?? base?.gross_weight_kg,
      volume_cbm: item.volumeCbm ?? base?.volume_cbm ?? null,
      num_packages: item.numPackages ?? base?.num_packages,
      package_type: item.packageType ?? base?.package_type,
      declared_value_usd: item.declaredValueUsd ?? base?.declared_value_usd ?? null,
      is_hazmat: item.isHazmat ?? base?.is_hazmat ?? false,
      hazmat_un_number: item.hazmatUnNumber ?? base?.hazmat_un_number ?? null,
      hazmat_proper_shipping_name:
        item.hazmatProperShippingName ?? base?.hazmat_proper_shipping_name ?? null,
      hazmat_class: item.hazmatClass ?? base?.hazmat_class ?? null,
      hazmat_packing_group:
        item.hazmatPackingGroup ?? base?.hazmat_packing_group ?? null,
    };
  }

  async getCargoItems(
    tenantId: string,
    shipmentId: string,
  ): Promise<CargoItem[]> {
    return this.cargoItemRepository.find({
      where: { tenant_id: tenantId, shipment_id: shipmentId },
      order: { is_primary: 'DESC', created_at: 'ASC' },
    });
  }

  async addCargoItem(
    tenantId: string,
    shipmentId: string,
    dto: CargoItemInputDto,
  ): Promise<CargoItem> {
    const hasExisting =
      (await this.cargoItemRepository.count({
        where: { shipment_id: shipmentId },
      })) > 0;
    return this.cargoItemRepository.save(
      this.cargoItemRepository.create({
        tenant_id: tenantId,
        shipment_id: shipmentId,
        is_primary: !hasExisting,
        ...this.toCargoItemColumns(dto),
      }),
    );
  }

  async updateCargoItem(
    tenantId: string,
    shipmentId: string,
    cargoItemId: string,
    dto: UpdateCargoItemDto,
  ): Promise<CargoItem> {
    const item = await this.cargoItemRepository.findOne({
      where: { id: cargoItemId, tenant_id: tenantId, shipment_id: shipmentId },
    });
    if (!item) {
      throw new NotFoundException(`Cargo item ${cargoItemId} not found`);
    }
    Object.assign(item, this.toCargoItemColumns(dto, item));
    return this.cargoItemRepository.save(item);
  }

  async removeCargoItem(
    tenantId: string,
    shipmentId: string,
    cargoItemId: string,
  ): Promise<void> {
    await this.cargoItemRepository.delete({
      id: cargoItemId,
      tenant_id: tenantId,
      shipment_id: shipmentId,
    });
  }

  // Sets (or clears, on null) the primary party for each given role,
  // writing directly to shipment_parties — the sole party store now that
  // reads no longer touch the legacy shipper_id/consignee_id/notify_party_id
  // columns, which are left untouched in the DB (dropped in a later step).
  private async setPrimaryParties(
    tenantId: string,
    shipmentId: string,
    roles: {
      shipperId?: string | null;
      consigneeId?: string | null;
      notifyPartyId?: string | null;
    },
  ): Promise<void> {
    const pairs: [PartyRole, string | null | undefined][] = [
      [PartyRole.SHIPPER, roles.shipperId],
      [PartyRole.CONSIGNEE, roles.consigneeId],
      [PartyRole.NOTIFY_PARTY, roles.notifyPartyId],
    ];

    for (const [role, partyId] of pairs) {
      if (partyId === undefined) continue;

      const existing = await this.shipmentPartyRepository.findOne({
        where: { shipment_id: shipmentId, role, is_primary: true },
      });

      if (!partyId) {
        // Explicit null clears the primary party for this role.
        if (existing) await this.shipmentPartyRepository.remove(existing);
        continue;
      }

      if (existing) {
        if (existing.party_id !== partyId) {
          existing.party_id = partyId;
          await this.shipmentPartyRepository.save(existing);
        }
      } else {
        await this.shipmentPartyRepository.save(
          this.shipmentPartyRepository.create({
            tenant_id: tenantId,
            shipment_id: shipmentId,
            party_id: partyId,
            role,
            is_primary: true,
          }),
        );
      }
    }
  }

  async getShipmentParties(
    tenantId: string,
    shipmentId: string,
  ): Promise<ShipmentParty[]> {
    return this.shipmentPartyRepository.find({
      where: { tenant_id: tenantId, shipment_id: shipmentId },
      relations: { party: true },
      order: { role: 'ASC', is_primary: 'DESC', created_at: 'ASC' },
    });
  }

  async attachShipmentParty(
    tenantId: string,
    shipmentId: string,
    dto: AttachShipmentPartyDto,
  ): Promise<ShipmentParty> {
    const existing = await this.shipmentPartyRepository.findOne({
      where: {
        tenant_id: tenantId,
        shipment_id: shipmentId,
        party_id: dto.partyId,
        role: dto.role,
      },
    });
    if (existing) {
      if (dto.isPrimary) {
        await this.clearPrimary(tenantId, shipmentId, dto.role);
        existing.is_primary = true;
        return this.shipmentPartyRepository.save(existing);
      }
      return existing;
    }

    if (dto.isPrimary) {
      await this.clearPrimary(tenantId, shipmentId, dto.role);
    }
    return this.shipmentPartyRepository.save(
      this.shipmentPartyRepository.create({
        tenant_id: tenantId,
        shipment_id: shipmentId,
        party_id: dto.partyId,
        role: dto.role,
        is_primary: dto.isPrimary ?? false,
      }),
    );
  }

  async detachShipmentParty(
    tenantId: string,
    shipmentId: string,
    partyId: string,
    role?: PartyRole,
  ): Promise<void> {
    await this.shipmentPartyRepository.delete({
      tenant_id: tenantId,
      shipment_id: shipmentId,
      party_id: partyId,
      ...(role ? { role } : {}),
    });
  }

  private async clearPrimary(
    tenantId: string,
    shipmentId: string,
    role: PartyRole,
  ): Promise<void> {
    await this.shipmentPartyRepository.update(
      { tenant_id: tenantId, shipment_id: shipmentId, role, is_primary: true },
      { is_primary: false },
    );
  }

  async updateStatus(
    tenantId: string,
    id: string,
    status: ShipmentStatus,
  ): Promise<Shipment> {
    const shipment = await this.shipmentRepository.findOne({
      where: { id, tenant_id: tenantId },
    });
    if (!shipment) {
      throw new NotFoundException(`Shipment ${id} not found`);
    }
    shipment.status = status;
    return this.shipmentRepository.save(shipment);
  }

  async addTrackingEvent(
    tenantId: string,
    shipmentId: string,
    dto: CreateTrackingEventDto,
  ): Promise<TrackingEvent> {
    const event = this.trackingEventRepository.create({
      tenant_id: tenantId,
      shipment_id: shipmentId,
      event_code: dto.eventCode,
      event_description: dto.eventDescription,
      location_name: dto.locationName ?? null,
      lat: dto.lat ?? null,
      lng: dto.lng ?? null,
      event_time: new Date(dto.eventTime),
      notes: dto.notes ?? null,
    });
    return this.trackingEventRepository.save(event);
  }

  async getTrackingEvents(
    tenantId: string,
    shipmentId: string,
  ): Promise<TrackingEvent[]> {
    return this.trackingEventRepository.find({
      where: { tenant_id: tenantId, shipment_id: shipmentId },
      order: { event_time: 'DESC' },
    });
  }

  async getDashboardStats(tenantId: string) {
    const [
      activeShipments,
      inTransit,
      ocean,
      air,
      inland,
      rail,
      customsHolds,
      recentShipments,
    ] = await Promise.all([
      this.shipmentRepository.count({
        where: {
          tenant_id: tenantId,
          status: In([ShipmentStatus.BOOKED, ShipmentStatus.IN_TRANSIT]),
        },
      }),
      this.shipmentRepository.count({
        where: { tenant_id: tenantId, status: ShipmentStatus.IN_TRANSIT },
      }),
      this.shipmentRepository.count({
        where: {
          tenant_id: tenantId,
          status: ShipmentStatus.IN_TRANSIT,
          mode: ShipmentMode.OCEAN,
        },
      }),
      this.shipmentRepository.count({
        where: {
          tenant_id: tenantId,
          status: ShipmentStatus.IN_TRANSIT,
          mode: ShipmentMode.AIR,
        },
      }),
      this.shipmentRepository.count({
        where: {
          tenant_id: tenantId,
          status: ShipmentStatus.IN_TRANSIT,
          mode: ShipmentMode.INLAND,
        },
      }),
      this.shipmentRepository.count({
        where: {
          tenant_id: tenantId,
          status: ShipmentStatus.IN_TRANSIT,
          mode: ShipmentMode.RAIL,
        },
      }),
      this.shipmentRepository.count({
        where: { tenant_id: tenantId, status: ShipmentStatus.CUSTOMS_HOLD },
      }),
      this.findAll(tenantId),
    ]);

    return {
      activeShipments,
      inTransit,
      inTransitByMode: {
        OCEAN: ocean,
        AIR: air,
        INLAND: inland,
        RAIL: rail,
      },
      docsPending: 0, // placeholder until documents module is implemented
      customsHolds,
      recentShipments: recentShipments.slice(0, 10),
    };
  }

  private async generateShipmentNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `SHP-${year}-`;
    // Count globally for the year so the unique shipment_number never collides
    // across tenants.
    const countThisYear = await this.shipmentRepository.count({
      where: { shipment_number: ILike(`${prefix}%`) },
    });
    const sequence = String(countThisYear + 1).padStart(4, '0');
    return `${prefix}${sequence}`;
  }
}
