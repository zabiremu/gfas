import { MigrationInterface, QueryRunner } from 'typeorm';

// Creates cargo_items (multi-line cargo per shipment), replacing the cargo
// fields inlined on shipments, and backfills one primary row per existing
// shipment from its current inlined values. The inlined columns are left
// untouched here — the app dual-writes both during this step, and a later
// migration drops them once reads have cut over.
export class CreateCargoItems1784211501177 implements MigrationInterface {
  name = 'CreateCargoItems1784211501177';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "cargo_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "shipment_id" uuid NOT NULL,
        "goods_description" text NOT NULL,
        "hs_code" character varying,
        "country_of_origin" character varying,
        "gross_weight_kg" numeric(12,3) NOT NULL,
        "volume_cbm" numeric(12,3),
        "num_packages" integer NOT NULL,
        "package_type" character varying NOT NULL,
        "declared_value_usd" numeric(14,2),
        "is_hazmat" boolean NOT NULL DEFAULT false,
        "hazmat_un_number" character varying,
        "hazmat_proper_shipping_name" character varying,
        "hazmat_class" character varying,
        "hazmat_packing_group" character varying,
        "is_primary" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_cargo_items" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "cargo_items" ADD CONSTRAINT "FK_cargo_items_shipment" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_cargo_items_shipment" ON "cargo_items" ("shipment_id")
    `);

    // Backfill: one primary cargo_items row per existing shipment from its
    // current inlined cargo columns.
    await queryRunner.query(`
      INSERT INTO "cargo_items" (
        tenant_id, shipment_id, goods_description, hs_code, country_of_origin,
        gross_weight_kg, volume_cbm, num_packages, package_type,
        declared_value_usd, is_hazmat, hazmat_un_number,
        hazmat_proper_shipping_name, hazmat_class, hazmat_packing_group,
        is_primary
      )
      SELECT
        tenant_id, id, goods_description, hs_code, country_of_origin,
        gross_weight_kg, volume_cbm, num_packages, package_type,
        declared_value_usd, is_hazmat, hazmat_un_number,
        hazmat_proper_shipping_name, hazmat_class, hazmat_packing_group,
        true
      FROM "shipments"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_cargo_items_shipment"`);
    await queryRunner.query(`ALTER TABLE "cargo_items" DROP CONSTRAINT "FK_cargo_items_shipment"`);
    await queryRunner.query(`DROP TABLE "cargo_items"`);
  }
}
