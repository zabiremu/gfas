import { MigrationInterface, QueryRunner } from 'typeorm';

// Adds RAIL alongside OCEAN/AIR/INLAND on shipments.mode. Postgres enum
// values can't be dropped, so down() is a no-op — reverting would require
// recreating the type, which we don't need for an additive change like this.
export class AddRailShipmentMode1784300000000 implements MigrationInterface {
  name = 'AddRailShipmentMode1784300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."shipments_mode_enum" ADD VALUE IF NOT EXISTS 'RAIL'`,
    );
  }

  public async down(): Promise<void> {
    // Intentionally a no-op — see class comment.
  }
}
