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
import { Party } from './party.entity';
import { ShipmentMode } from './shipment.entity';
import { Tenant } from './tenant.entity';
import type { RateSheetItem } from './rate-sheet-item.entity';

// Reference/pricing data, independent of any specific shipment.
@Entity('rate_sheets')
export class RateSheet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'uuid', nullable: true })
  carrier_party_id: string | null;

  @ManyToOne(() => Party, { nullable: true })
  @JoinColumn({ name: 'carrier_party_id' })
  carrierParty: Party | null;

  // enumName pins this to the same Postgres type as Shipment.mode
  // (shipments_mode_enum) rather than letting TypeORM default to a new
  // rate_sheets-scoped type name, which would fight the migration for
  // ownership of the enum values under `synchronize` in dev.
  @Column({ type: 'enum', enum: ShipmentMode, enumName: 'shipments_mode_enum' })
  mode: ShipmentMode;

  @Column({ type: 'varchar', nullable: true })
  origin_port: string | null;

  @Column({ type: 'varchar', nullable: true })
  destination_port: string | null;

  @Column({ type: 'date' })
  effective_from: Date;

  // Nullable: open-ended (no expiry yet set).
  @Column({ type: 'date', nullable: true })
  effective_to: Date | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @OneToMany('RateSheetItem', 'rateSheet')
  items: RateSheetItem[];

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
