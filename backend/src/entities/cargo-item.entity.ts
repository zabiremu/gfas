import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Shipment } from './shipment.entity';

// One-to-many cargo lines for a shipment, replacing the cargo fields that
// used to be inlined directly on Shipment (which only allowed one line).
@Entity('cargo_items')
export class CargoItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  shipment_id: string;

  @ManyToOne(() => Shipment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shipment_id' })
  shipment: Shipment;

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

  // Marks the canonical cargo line for a shipment while single-line
  // consumers (documents, older clients) still expect exactly one.
  @Column({ type: 'boolean', default: false })
  is_primary: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
