import { MigrationInterface, QueryRunner } from 'typeorm';

// Creates invoices + invoice_line_items — the finance module's billing
// tables. Independent of any prior migration's data (greenfield tables, no
// backfill needed).
export class CreateInvoices1784228469324 implements MigrationInterface {
  name = 'CreateInvoices1784228469324';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."invoices_status_enum" AS ENUM ('DRAFT', 'SENT', 'PAID', 'VOID')
    `);
    await queryRunner.query(`
      CREATE TABLE "invoices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "shipment_id" uuid,
        "bill_to_party_id" uuid NOT NULL,
        "invoice_number" character varying NOT NULL,
        "status" "public"."invoices_status_enum" NOT NULL DEFAULT 'DRAFT',
        "currency" character varying NOT NULL DEFAULT 'USD',
        "subtotal_amount" numeric(14,2) NOT NULL DEFAULT 0,
        "tax_amount" numeric(14,2) NOT NULL DEFAULT 0,
        "total_amount" numeric(14,2) NOT NULL DEFAULT 0,
        "issue_date" date NOT NULL,
        "due_date" date,
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_invoices" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "invoices" ADD CONSTRAINT "FK_invoices_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "invoices" ADD CONSTRAINT "FK_invoices_shipment" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "invoices" ADD CONSTRAINT "FK_invoices_bill_to_party" FOREIGN KEY ("bill_to_party_id") REFERENCES "parties"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_invoices_tenant" ON "invoices" ("tenant_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_invoices_shipment" ON "invoices" ("shipment_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "invoice_line_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "invoice_id" uuid NOT NULL,
        "cargo_item_id" uuid,
        "description" character varying NOT NULL,
        "quantity" numeric(12,3) NOT NULL DEFAULT 1,
        "unit_price" numeric(14,2) NOT NULL,
        "amount" numeric(14,2) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_invoice_line_items" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "invoice_line_items" ADD CONSTRAINT "FK_invoice_line_items_invoice" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "invoice_line_items" ADD CONSTRAINT "FK_invoice_line_items_cargo_item" FOREIGN KEY ("cargo_item_id") REFERENCES "cargo_items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_invoice_line_items_invoice" ON "invoice_line_items" ("invoice_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_invoice_line_items_invoice"`);
    await queryRunner.query(`ALTER TABLE "invoice_line_items" DROP CONSTRAINT "FK_invoice_line_items_cargo_item"`);
    await queryRunner.query(`ALTER TABLE "invoice_line_items" DROP CONSTRAINT "FK_invoice_line_items_invoice"`);
    await queryRunner.query(`DROP TABLE "invoice_line_items"`);

    await queryRunner.query(`DROP INDEX "public"."IDX_invoices_shipment"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_invoices_tenant"`);
    await queryRunner.query(`ALTER TABLE "invoices" DROP CONSTRAINT "FK_invoices_bill_to_party"`);
    await queryRunner.query(`ALTER TABLE "invoices" DROP CONSTRAINT "FK_invoices_shipment"`);
    await queryRunner.query(`ALTER TABLE "invoices" DROP CONSTRAINT "FK_invoices_tenant"`);
    await queryRunner.query(`DROP TABLE "invoices"`);
    await queryRunner.query(`DROP TYPE "public"."invoices_status_enum"`);
  }
}
