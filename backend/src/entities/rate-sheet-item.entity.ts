import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RateSheet } from './rate-sheet.entity';

export enum RateBasis {
  PER_KG = 'PER_KG',
  PER_CBM = 'PER_CBM',
  FLAT = 'FLAT',
  PER_CONTAINER = 'PER_CONTAINER',
  PER_PACKAGE = 'PER_PACKAGE',
}

@Entity('rate_sheet_items')
export class RateSheetItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  rate_sheet_id: string;

  @ManyToOne(() => RateSheet, (rateSheet) => rateSheet.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'rate_sheet_id' })
  rateSheet: RateSheet;

  // e.g. 'OCEAN_FREIGHT', 'THC', 'DOC_FEE'
  @Column({ type: 'varchar' })
  charge_code: string;

  @Column({ type: 'varchar' })
  description: string;

  @Column({ type: 'enum', enum: RateBasis })
  rate_basis: RateBasis;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  rate_amount: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  min_charge: number | null;

  @Column({ type: 'varchar', default: 'USD' })
  currency: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
