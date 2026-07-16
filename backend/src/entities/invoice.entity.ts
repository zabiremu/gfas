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
import { Shipment } from './shipment.entity';
import { Tenant } from './tenant.entity';
import type { InvoiceLineItem } from './invoice-line-item.entity';

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PAID = 'PAID',
  VOID = 'VOID',
}

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  // Nullable: invoices can exist for ancillary services independent of any
  // one shipment (e.g. storage fees, admin charges).
  @Column({ type: 'uuid', nullable: true })
  shipment_id: string | null;

  @ManyToOne(() => Shipment, { nullable: true })
  @JoinColumn({ name: 'shipment_id' })
  shipment: Shipment | null;

  @Column({ type: 'uuid' })
  bill_to_party_id: string;

  @ManyToOne(() => Party)
  @JoinColumn({ name: 'bill_to_party_id' })
  billToParty: Party;

  @Column({ type: 'varchar' })
  invoice_number: string;

  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.DRAFT })
  status: InvoiceStatus;

  @Column({ type: 'varchar', default: 'USD' })
  currency: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  subtotal_amount: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  tax_amount: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  total_amount: number;

  @Column({ type: 'date' })
  issue_date: Date;

  @Column({ type: 'date', nullable: true })
  due_date: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany('InvoiceLineItem', 'invoice')
  lineItems: InvoiceLineItem[];

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
