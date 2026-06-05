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

export enum ShipmentMode {
  OCEAN = 'OCEAN',
  AIR = 'AIR',
  INLAND = 'INLAND',
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

  @Column({ type: 'text' })
  goods_description: string;

  @Column({ type: 'varchar', nullable: true })
  hs_code: string | null;

  @Column({ type: 'varchar', nullable: true })
  country_of_origin: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 3 })
  gross_weight_kg: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, nullable: true })
  volume_cbm: number | null;

  @Column({ type: 'int' })
  num_packages: number;

  @Column({ type: 'varchar' })
  package_type: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  declared_value_usd: number | null;

  @Column({ type: 'boolean', default: false })
  is_hazmat: boolean;

  @Column({ type: 'varchar', nullable: true })
  hazmat_un_number: string | null;

  @Column({ type: 'varchar', nullable: true })
  hazmat_proper_shipping_name: string | null;

  @Column({ type: 'varchar', nullable: true })
  hazmat_class: string | null;

  @Column({ type: 'varchar', nullable: true })
  hazmat_packing_group: string | null;

  @Column({ type: 'uuid', nullable: true })
  shipper_id: string | null;

  @ManyToOne(() => Party, { nullable: true })
  @JoinColumn({ name: 'shipper_id' })
  shipper: Party | null;

  @Column({ type: 'uuid', nullable: true })
  consignee_id: string | null;

  @ManyToOne(() => Party, { nullable: true })
  @JoinColumn({ name: 'consignee_id' })
  consignee: Party | null;

  @Column({ type: 'uuid', nullable: true })
  notify_party_id: string | null;

  @ManyToOne(() => Party, { nullable: true })
  @JoinColumn({ name: 'notify_party_id' })
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

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
