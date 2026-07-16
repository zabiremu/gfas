import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Party, PartyRole } from './party.entity';
import { Shipment } from './shipment.entity';

// Many-to-many linking a shipment to any number of parties per role
// (e.g. multiple notify parties), replacing the old shipper_id/consignee_id/
// notify_party_id direct FKs on Shipment.
@Entity('shipment_parties')
@Index(['shipment_id', 'role'])
export class ShipmentParty {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'uuid' })
  shipment_id: string;

  @ManyToOne(() => Shipment, (shipment) => shipment.shipmentParties, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'shipment_id' })
  shipment: Shipment;

  @Column({ type: 'uuid' })
  party_id: string;

  @ManyToOne(() => Party, (party) => party.shipmentParties)
  @JoinColumn({ name: 'party_id' })
  party: Party;

  // Uses its own Postgres enum type (rather than sharing parties_role_enum)
  // so schema sync never has to alter a type shared across two tables at
  // once — TypeORM's synchronize can't safely rename/drop an enum type that
  // a second column still references mid-alteration.
  @Column({
    type: 'enum',
    enum: PartyRole,
    enumName: 'shipment_parties_role_enum',
  })
  role: PartyRole;

  // Marks the canonical party for a role when multiple exist (e.g. which
  // notify party to show first on generated documents).
  @Column({ type: 'boolean', default: false })
  is_primary: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
