import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, In, Repository } from 'typeorm';
import {
  Shipment,
  ShipmentMode,
  ShipmentStatus,
} from '../entities/shipment.entity';
import { TrackingEvent } from '../entities/tracking-event.entity';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { CreateTrackingEventDto } from './dto/create-tracking-event.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';

@Injectable()
export class ShipmentsService {
  constructor(
    @InjectRepository(Shipment)
    private readonly shipmentRepository: Repository<Shipment>,
    @InjectRepository(TrackingEvent)
    private readonly trackingEventRepository: Repository<TrackingEvent>,
  ) {}

  async findAll(
    tenantId: string,
    query?: { status?: ShipmentStatus; mode?: ShipmentMode; q?: string },
  ): Promise<Shipment[]> {
    const base: FindOptionsWhere<Shipment> = { tenant_id: tenantId };
    if (query?.status) {
      base.status = query.status;
    }
    if (query?.mode) {
      base.mode = query.mode;
    }

    // When a search term is supplied, match either shipment_number OR
    // goods_description by using an array of where-clauses (OR semantics).
    const where: FindOptionsWhere<Shipment> | FindOptionsWhere<Shipment>[] =
      query?.q
        ? [
            { ...base, shipment_number: ILike(`%${query.q}%`) },
            { ...base, goods_description: ILike(`%${query.q}%`) },
          ]
        : base;

    return this.shipmentRepository.find({
      where,
      relations: { shipper: true, consignee: true },
      order: { created_at: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<Shipment> {
    const shipment = await this.shipmentRepository.findOne({
      where: { id, tenant_id: tenantId },
      relations: {
        shipper: true,
        consignee: true,
        notifyParty: true,
        documents: true,
        trackingEvents: true,
      },
    });
    if (!shipment) {
      throw new NotFoundException(`Shipment ${id} not found`);
    }
    return shipment;
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
      origin_port: dto.originPort,
      destination_port: dto.destinationPort,
      etd: dto.etd ? new Date(dto.etd) : null,
      eta: dto.eta ? new Date(dto.eta) : null,
      vessel_name: dto.vesselName ?? null,
      flight_number: dto.flightNumber ?? null,
      mawb_number: dto.mawbNumber ?? null,
      goods_description: dto.goodsDescription,
      hs_code: dto.hsCode ?? null,
      country_of_origin: dto.countryOfOrigin ?? null,
      gross_weight_kg: dto.grossWeightKg,
      volume_cbm: dto.volumeCbm ?? null,
      num_packages: dto.numPackages,
      package_type: dto.packageType,
      declared_value_usd: dto.declaredValueUsd ?? null,
      is_hazmat: dto.isHazmat ?? false,
      hazmat_un_number: dto.hazmatUnNumber ?? null,
      hazmat_proper_shipping_name: dto.hazmatProperShippingName ?? null,
      hazmat_class: dto.hazmatClass ?? null,
      hazmat_packing_group: dto.hazmatPackingGroup ?? null,
      shipper_id: dto.shipperId ?? null,
      consignee_id: dto.consigneeId ?? null,
      notify_party_id: dto.notifyPartyId ?? null,
    });

    return this.shipmentRepository.save(shipment);
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
    if (dto.goodsDescription !== undefined)
      shipment.goods_description = dto.goodsDescription;
    if (dto.hsCode !== undefined) shipment.hs_code = dto.hsCode;
    if (dto.countryOfOrigin !== undefined)
      shipment.country_of_origin = dto.countryOfOrigin;
    if (dto.grossWeightKg !== undefined)
      shipment.gross_weight_kg = dto.grossWeightKg;
    if (dto.volumeCbm !== undefined) shipment.volume_cbm = dto.volumeCbm;
    if (dto.numPackages !== undefined) shipment.num_packages = dto.numPackages;
    if (dto.packageType !== undefined) shipment.package_type = dto.packageType;
    if (dto.declaredValueUsd !== undefined)
      shipment.declared_value_usd = dto.declaredValueUsd;
    if (dto.isHazmat !== undefined) shipment.is_hazmat = dto.isHazmat;
    if (dto.hazmatUnNumber !== undefined)
      shipment.hazmat_un_number = dto.hazmatUnNumber;
    if (dto.hazmatProperShippingName !== undefined)
      shipment.hazmat_proper_shipping_name = dto.hazmatProperShippingName;
    if (dto.hazmatClass !== undefined) shipment.hazmat_class = dto.hazmatClass;
    if (dto.hazmatPackingGroup !== undefined)
      shipment.hazmat_packing_group = dto.hazmatPackingGroup;
    if (dto.shipperId !== undefined) shipment.shipper_id = dto.shipperId;
    if (dto.consigneeId !== undefined) shipment.consignee_id = dto.consigneeId;
    if (dto.notifyPartyId !== undefined)
      shipment.notify_party_id = dto.notifyPartyId;

    return this.shipmentRepository.save(shipment);
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
    shipmentId: string,
    dto: CreateTrackingEventDto,
  ): Promise<TrackingEvent> {
    const event = this.trackingEventRepository.create({
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

  async getTrackingEvents(shipmentId: string): Promise<TrackingEvent[]> {
    return this.trackingEventRepository.find({
      where: { shipment_id: shipmentId },
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
