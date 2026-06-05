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

export enum DocumentStatus {
  DRAFT = 'DRAFT',
  ISSUED = 'ISSUED',
  SENT = 'SENT',
  SIGNED = 'SIGNED',
  VOID = 'VOID',
}

// NOTE: Named `ShipmentDocument` (not `Document`) to avoid shadowing the
// global DOM `Document` type. Table name is kept as `documents`.
@Entity('documents')
export class ShipmentDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'uuid' })
  shipment_id: string;

  @ManyToOne(() => Shipment, (shipment) => shipment.documents)
  @JoinColumn({ name: 'shipment_id' })
  shipment: Shipment;

  @Column({ type: 'varchar' })
  doc_type: string;

  @Column({ type: 'enum', enum: DocumentStatus, default: DocumentStatus.DRAFT })
  status: DocumentStatus;

  @Column({ type: 'varchar', nullable: true })
  file_url: string | null;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'timestamp', nullable: true })
  generated_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  sent_at: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
