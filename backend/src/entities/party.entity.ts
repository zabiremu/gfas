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
// Type-only import: party.entity.ts must not runtime-import
// shipment-party.entity.ts, since that file imports PartyRole from here —
// a runtime cycle would leave PartyRole undefined when its @Column decorator
// evaluates. The OneToMany target below is given by string name instead.
import type { ShipmentParty } from './shipment-party.entity';

export enum PartyRole {
  SHIPPER = 'SHIPPER',
  CONSIGNEE = 'CONSIGNEE',
  NOTIFY_PARTY = 'NOTIFY_PARTY',
  FREIGHT_FORWARDER = 'FREIGHT_FORWARDER',
  CUSTOMS_BROKER = 'CUSTOMS_BROKER',
}

@Entity('parties')
export class Party {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'varchar' })
  name: string;

  // Now just a UI hint for new-party forms — a party's actual role is
  // per-shipment via shipment_parties, since the same company can be a
  // shipper on one shipment and a consignee on another.
  @Column({ type: 'enum', enum: PartyRole, nullable: true })
  default_role: PartyRole | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'varchar', nullable: true })
  city: string | null;

  @Column({ type: 'varchar', nullable: true })
  state: string | null;

  @Column({ type: 'varchar', nullable: true })
  country: string | null;

  @Column({ type: 'varchar', nullable: true })
  postal_code: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column({ type: 'varchar', nullable: true })
  tax_id: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @OneToMany('ShipmentParty', 'party')
  shipmentParties: ShipmentParty[];
}
