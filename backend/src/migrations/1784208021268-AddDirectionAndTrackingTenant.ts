import { MigrationInterface, QueryRunner } from 'typeorm';

// Adds Shipment.direction (nullable — existing shipments predate this column
// and have no reliable way to infer historical direction) and backfills a
// NOT NULL TrackingEvent.tenant_id (previously tenant scoping relied on an
// implicit join through shipments).
export class AddDirectionAndTrackingTenant1784208021268
  implements MigrationInterface
{
  name = 'AddDirectionAndTrackingTenant1784208021268';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."shipments_direction_enum" AS ENUM ('IMPORT', 'EXPORT', 'DOMESTIC')
    `);
    await queryRunner.query(`
      ALTER TABLE "shipments" ADD "direction" "public"."shipments_direction_enum"
    `);

    await queryRunner.query(`
      ALTER TABLE "tracking_events" ADD "tenant_id" uuid
    `);
    await queryRunner.query(`
      UPDATE "tracking_events"
      SET "tenant_id" = "shipments"."tenant_id"
      FROM "shipments"
      WHERE "tracking_events"."shipment_id" = "shipments"."id"
    `);
    await queryRunner.query(`
      ALTER TABLE "tracking_events" ALTER COLUMN "tenant_id" SET NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_tracking_events_tenant" ON "tracking_events" ("tenant_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_tracking_events_tenant"`);
    await queryRunner.query(`ALTER TABLE "tracking_events" DROP COLUMN "tenant_id"`);

    await queryRunner.query(`ALTER TABLE "shipments" DROP COLUMN "direction"`);
    await queryRunner.query(`DROP TYPE "public"."shipments_direction_enum"`);
  }
}
