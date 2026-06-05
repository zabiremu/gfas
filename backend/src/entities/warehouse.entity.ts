import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { Shipment } from './shipment.entity';

export enum WarehouseStatus {
  IN_STORAGE = 'IN_STORAGE',
  RELEASED = 'RELEASED',
}

@Entity('warehouse_entries')
export class WarehouseEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'uuid', nullable: true })
  shipment_id: string | null;

  @ManyToOne(() => Shipment, { nullable: true })
  @JoinColumn({ name: 'shipment_id' })
  shipment: Shipment | null;

  @Column({ type: 'varchar' })
  customer_name: string;

  @Column({ type: 'varchar' })
  batch_number: string;

  @Column({ type: 'varchar', nullable: true })
  lot_number: string | null;

  @Column({ type: 'int' })
  num_pallets: number;

  @Column({ type: 'decimal', precision: 12, scale: 3 })
  weight_kg: number;

  @Column({ type: 'boolean', default: false })
  is_hazmat: boolean;

  @Column({ type: 'varchar', nullable: true })
  hazmat_class: string | null;

  @Column({ type: 'varchar', nullable: true })
  hazmat_un_number: string | null;

  @Column({ type: 'varchar', nullable: true })
  zone: string | null;

  @Column({ type: 'varchar', nullable: true })
  aisle: string | null;

  @Column({ type: 'varchar', nullable: true })
  rack: string | null;

  @Column({ type: 'varchar', nullable: true })
  level: string | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  temp_min: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  temp_max: number | null;

  @Column({ type: 'date' })
  storage_start_date: Date;

  @Column({ type: 'date', nullable: true })
  storage_end_date: Date | null;

  @Column({ type: 'enum', enum: WarehouseStatus, default: WarehouseStatus.IN_STORAGE })
  status: WarehouseStatus;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  movement_log: Record<string, any>[];

  @Column({ type: 'timestamp', nullable: true })
  released_at: Date | null;

  @Column({ type: 'varchar', nullable: true })
  released_by: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
