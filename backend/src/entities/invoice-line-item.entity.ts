import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CargoItem } from './cargo-item.entity';
import { Invoice } from './invoice.entity';

@Entity('invoice_line_items')
export class InvoiceLineItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  invoice_id: string;

  @ManyToOne(() => Invoice, (invoice) => invoice.lineItems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;

  // Nullable: not every line item traces back to a cargo line (e.g. handling
  // fees, admin charges).
  @Column({ type: 'uuid', nullable: true })
  cargo_item_id: string | null;

  @ManyToOne(() => CargoItem, { nullable: true })
  @JoinColumn({ name: 'cargo_item_id' })
  cargoItem: CargoItem | null;

  @Column({ type: 'varchar' })
  description: string;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  unit_price: number;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
