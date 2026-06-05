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

export enum UserRole {
  ADMIN = 'ADMIN',
  AGENT = 'AGENT',
  WAREHOUSE = 'WAREHOUSE',
  CUSTOMER = 'CUSTOMER',
  VIEWER = 'VIEWER',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar' })
  password_hash: string;

  @Column({ type: 'varchar' })
  first_name: string;

  @Column({ type: 'varchar' })
  last_name: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
