import { readFileSync } from 'fs';
import { join } from 'path';
import { MigrationInterface, QueryRunner } from 'typeorm';

// Creates document_templates (DB-backed override of the on-disk .hbs
// templates) and seeds the two pre-existing templates (bill-of-lading,
// commercial-invoice) as system-default rows (tenant_id = null) so
// DocumentsService.resolveTemplate has DB rows to prefer over the file
// fallback from day one.
export class CreateDocumentTemplates1784229800000
  implements MigrationInterface
{
  name = 'CreateDocumentTemplates1784229800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."document_templates_document_type_enum" AS ENUM (
        'HOUSE_BILL_OF_LADING', 'MASTER_BILL_OF_LADING', 'AIR_WAYBILL',
        'COMMERCIAL_INVOICE', 'PROFORMA_INVOICE', 'PACKING_LIST',
        'CERTIFICATE_OF_ORIGIN', 'IMO_DGD'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "document_templates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid,
        "document_type" "public"."document_templates_document_type_enum" NOT NULL,
        "name" character varying NOT NULL,
        "handlebars_body" text NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_document_templates" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "document_templates" ADD CONSTRAINT "FK_document_templates_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_document_templates_tenant_type_active" ON "document_templates" ("tenant_id", "document_type", "is_active")
    `);

    // Migrations compile to dist/migrations (ts-node runs from src/migrations
    // in dev) — both have a sibling documents/templates/ dir with the .hbs
    // files, since the Nest build copies them alongside the compiled JS.
    const templatesDir = join(__dirname, '..', 'documents', 'templates');
    const seedRows: Array<{ docType: string; name: string; file: string }> = [
      {
        docType: 'HOUSE_BILL_OF_LADING',
        name: 'House Bill of Lading (System Default)',
        file: 'bill-of-lading.hbs',
      },
      {
        docType: 'COMMERCIAL_INVOICE',
        name: 'Commercial Invoice (System Default)',
        file: 'commercial-invoice.hbs',
      },
    ];

    for (const row of seedRows) {
      const body = readFileSync(join(templatesDir, row.file), 'utf8');
      await queryRunner.query(
        `INSERT INTO "document_templates" ("tenant_id", "document_type", "name", "handlebars_body", "version", "is_active")
         VALUES (NULL, $1, $2, $3, 1, true)`,
        [row.docType, row.name, body],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_document_templates_tenant_type_active"`,
    );
    await queryRunner.query(
      `ALTER TABLE "document_templates" DROP CONSTRAINT "FK_document_templates_tenant"`,
    );
    await queryRunner.query(`DROP TABLE "document_templates"`);
    await queryRunner.query(
      `DROP TYPE "public"."document_templates_document_type_enum"`,
    );
  }
}
