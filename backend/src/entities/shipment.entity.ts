import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { Party } from './party.entity';
import { User } from './user.entity';
import { ShipmentDocument } from './document.entity';
import { TrackingEvent } from './tracking-event.entity';
import { ShipmentParty } from './shipment-party.entity';
import { CargoItem } from './cargo-item.entity';

export enum ShipmentMode {
  OCEAN = 'OCEAN',
  AIR = 'AIR',
  INLAND = 'INLAND',
  RAIL = 'RAIL',
}

export enum ShipmentStatus {
  DRAFT = 'DRAFT',
  BOOKED = 'BOOKED',
  IN_TRANSIT = 'IN_TRANSIT',
  CUSTOMS_HOLD = 'CUSTOMS_HOLD',
  ARRIVED = 'ARRIVED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum ShipmentDirection {
  IMPORT = 'IMPORT',
  EXPORT = 'EXPORT',
  DOMESTIC = 'DOMESTIC',
}

@Entity('shipments')
export class Shipment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'varchar', unique: true })
  shipment_number: string;

  @Column({ type: 'enum', enum: ShipmentMode })
  mode: ShipmentMode;

  @Column({ type: 'enum', enum: ShipmentStatus, default: ShipmentStatus.DRAFT })
  status: ShipmentStatus;

  // Nullable: existing shipments predate this column and have no reliable
  // way to infer historical direction, so they stay NULL ("Unknown" in UI).
  @Column({ type: 'enum', enum: ShipmentDirection, nullable: true })
  direction: ShipmentDirection | null;

  @Column({ type: 'varchar' })
  origin_port: string;

  @Column({ type: 'varchar' })
  destination_port: string;

  @Column({ type: 'date', nullable: true })
  etd: Date | null;

  @Column({ type: 'date', nullable: true })
  eta: Date | null;

  @Column({ type: 'varchar', nullable: true })
  vessel_name: string | null;

  @Column({ type: 'varchar', nullable: true })
  flight_number: string | null;

  @Column({ type: 'varchar', nullable: true })
  mawb_number: string | null;

  // Not TypeORM-mapped columns: populated in-memory from shipment_parties by
  // ShipmentsService/DocumentsService (see attachPrimaryParties()) for
  // backward-compatible API responses. The real source of truth for
  // shipment-party links is the shipment_parties table.
  shipper: Party | null;
  consignee: Party | null;
  notifyParty: Party | null;

  @Column({ type: 'uuid' })
  created_by: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @OneToMany(() => ShipmentDocument, (doc) => doc.shipment)
  documents: ShipmentDocument[];

  @OneToMany(() => TrackingEvent, (event) => event.shipment)
  trackingEvents: TrackingEvent[];

  @OneToMany(() => ShipmentParty, (sp) => sp.shipment)
  shipmentParties: ShipmentParty[];

  @OneToMany(() => CargoItem, (item) => item.shipment)
  cargoItems: CargoItem[];

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
