import { MigrationInterface, QueryRunner } from 'typeorm';

// Creates the shipment_parties many-to-many junction table (replacing the
// shipper_id/consignee_id/notify_party_id direct FKs on shipments) and
// backfills it from every existing shipment's current FK values. The legacy
// columns are left untouched here — the app dual-writes both during this
// step, and a later migration drops them once reads have cut over.
export class CreateShipmentParties1784208697678 implements MigrationInterface {
  name = 'CreateShipmentParties1784208697678';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // A dedicated enum type (not a reuse of parties_role_enum) so that
    // schema sync never needs to alter a type two tables reference at once.
    await queryRunner.query(`
      CREATE TYPE "public"."shipment_parties_role_enum" AS ENUM ('SHIPPER', 'CONSIGNEE', 'NOTIFY_PARTY', 'FREIGHT_FORWARDER', 'CUSTOMS_BROKER')
    `);
    await queryRunner.query(`
      CREATE TABLE "shipment_parties" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "shipment_id" uuid NOT NULL,
        "party_id" uuid NOT NULL,
        "role" "public"."shipment_parties_role_enum" NOT NULL,
        "is_primary" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_shipment_parties" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "shipment_parties" ADD CONSTRAINT "FK_shipment_parties_shipment" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "shipment_parties" ADD CONSTRAINT "FK_shipment_parties_party" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_shipment_parties_shipment_role" ON "shipment_parties" ("shipment_id", "role")
    `);

    // Backfill: one shipment_parties row per existing shipper/consignee/
    // notify_party FK, all marked as the primary party for that role.
    await queryRunner.query(`
      INSERT INTO "shipment_parties" (tenant_id, shipment_id, party_id, role, is_primary)
      SELECT tenant_id, id, shipper_id, 'SHIPPER', true FROM "shipments" WHERE shipper_id IS NOT NULL
    `);
    await queryRunner.query(`
      INSERT INTO "shipment_parties" (tenant_id, shipment_id, party_id, role, is_primary)
      SELECT tenant_id, id, consignee_id, 'CONSIGNEE', true FROM "shipments" WHERE consignee_id IS NOT NULL
    `);
    await queryRunner.query(`
      INSERT INTO "shipment_parties" (tenant_id, shipment_id, party_id, role, is_primary)
      SELECT tenant_id, id, notify_party_id, 'NOTIFY_PARTY', true FROM "shipments" WHERE notify_party_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_shipment_parties_shipment_role"`);
    await queryRunner.query(`ALTER TABLE "shipment_parties" DROP CONSTRAINT "FK_shipment_parties_party"`);
    await queryRunner.query(`ALTER TABLE "shipment_parties" DROP CONSTRAINT "FK_shipment_parties_shipment"`);
    await queryRunner.query(`DROP TABLE "shipment_parties"`);
    await queryRunner.query(`DROP TYPE "public"."shipment_parties_role_enum"`);
  }
}
