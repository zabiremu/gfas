import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DOC_TYPES } from '../documents/doc-type.constants';

export type DocumentTemplateType = (typeof DOC_TYPES)[number]['value'];

// Overridable Handlebars templates for document generation. `tenant_id: null`
// rows are system defaults (shipped with the app); a tenant can add its own
// override row for a given `document_type`, which resolution prefers.
@Entity('document_templates')
@Index(['tenant_id', 'document_type', 'is_active'])
export class DocumentTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Null tenant_id marks a system-default template, visible to every tenant.
  @Column({ type: 'uuid', nullable: true })
  tenant_id: string | null;

  @Column({
    type: 'enum',
    enum: DOC_TYPES.map((t) => t.value),
    enumName: 'document_templates_document_type_enum',
  })
  document_type: DocumentTemplateType;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'text' })
  handlebars_body: string;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
