import { MigrationInterface, QueryRunner } from 'typeorm';

// Creates a warehouses facility master (distinct from warehouse_entries,
// which describes storage transactions within one) and backfills a default
// facility per tenant currently storing entries, so existing entries can be
// linked without loss.
export class CreateWarehouseFacilities1784212760805
  implements MigrationInterface
{
  name = 'CreateWarehouseFacilities1784212760805';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "warehouses" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "name" character varying NOT NULL,
        "code" character varying NOT NULL,
        "address" text,
        "city" character varying,
        "state" character varying,
        "country" character varying,
        "postal_code" character varying,
        "capacity_pallets" integer,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_warehouses" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "warehouses" ADD CONSTRAINT "FK_warehouses_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "warehouse_entries" ADD "warehouse_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "warehouse_entries" ADD CONSTRAINT "FK_warehouse_entries_warehouse" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // Backfill: one default facility per tenant currently storing entries,
    // then point every existing entry at its tenant's default facility.
    await queryRunner.query(`
      INSERT INTO "warehouses" (tenant_id, name, code, is_active)
      SELECT DISTINCT tenant_id, 'Main Warehouse', 'MAIN', true FROM "warehouse_entries"
    `);
    await queryRunner.query(`
      UPDATE "warehouse_entries" we
      SET "warehouse_id" = w.id
      FROM "warehouses" w
      WHERE w.tenant_id = we.tenant_id AND w.code = 'MAIN'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "warehouse_entries" DROP CONSTRAINT "FK_warehouse_entries_warehouse"`);
    await queryRunner.query(`ALTER TABLE "warehouse_entries" DROP COLUMN "warehouse_id"`);
    await queryRunner.query(`ALTER TABLE "warehouses" DROP CONSTRAINT "FK_warehouses_tenant"`);
    await queryRunner.query(`DROP TABLE "warehouses"`);
  }
}
