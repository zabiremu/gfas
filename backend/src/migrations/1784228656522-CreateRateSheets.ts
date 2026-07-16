import { MigrationInterface, QueryRunner } from 'typeorm';

// Creates rate_sheets + rate_sheet_items — reference pricing data,
// independent of any specific shipment. Greenfield tables, no backfill.
export class CreateRateSheets1784228656522 implements MigrationInterface {
  name = 'CreateRateSheets1784228656522';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "rate_sheets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "name" character varying NOT NULL,
        "carrier_party_id" uuid,
        "mode" "public"."shipments_mode_enum" NOT NULL,
        "origin_port" character varying,
        "destination_port" character varying,
        "effective_from" date NOT NULL,
        "effective_to" date,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_rate_sheets" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "rate_sheets" ADD CONSTRAINT "FK_rate_sheets_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "rate_sheets" ADD CONSTRAINT "FK_rate_sheets_carrier_party" FOREIGN KEY ("carrier_party_id") REFERENCES "parties"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_rate_sheets_tenant" ON "rate_sheets" ("tenant_id")
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."rate_sheet_items_rate_basis_enum" AS ENUM ('PER_KG', 'PER_CBM', 'FLAT', 'PER_CONTAINER', 'PER_PACKAGE')
    `);
    await queryRunner.query(`
      CREATE TABLE "rate_sheet_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "rate_sheet_id" uuid NOT NULL,
        "charge_code" character varying NOT NULL,
        "description" character varying NOT NULL,
        "rate_basis" "public"."rate_sheet_items_rate_basis_enum" NOT NULL,
        "rate_amount" numeric(14,2) NOT NULL,
        "min_charge" numeric(14,2),
        "currency" character varying NOT NULL DEFAULT 'USD',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_rate_sheet_items" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "rate_sheet_items" ADD CONSTRAINT "FK_rate_sheet_items_rate_sheet" FOREIGN KEY ("rate_sheet_id") REFERENCES "rate_sheets"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_rate_sheet_items_rate_sheet" ON "rate_sheet_items" ("rate_sheet_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_rate_sheet_items_rate_sheet"`);
    await queryRunner.query(`ALTER TABLE "rate_sheet_items" DROP CONSTRAINT "FK_rate_sheet_items_rate_sheet"`);
    await queryRunner.query(`DROP TABLE "rate_sheet_items"`);
    await queryRunner.query(`DROP TYPE "public"."rate_sheet_items_rate_basis_enum"`);

    await queryRunner.query(`DROP INDEX "public"."IDX_rate_sheets_tenant"`);
    await queryRunner.query(`ALTER TABLE "rate_sheets" DROP CONSTRAINT "FK_rate_sheets_carrier_party"`);
    await queryRunner.query(`ALTER TABLE "rate_sheets" DROP CONSTRAINT "FK_rate_sheets_tenant"`);
    await queryRunner.query(`DROP TABLE "rate_sheets"`);
  }
}
