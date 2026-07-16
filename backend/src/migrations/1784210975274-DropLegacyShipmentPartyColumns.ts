import { MigrationInterface, QueryRunner } from 'typeorm';

// Drops shipper_id/consignee_id/notify_party_id from shipments now that
// shipment_parties is the sole read/write path (cut over in the prior
// migration/step) — final cleanup of the party-cardinality refactor.
export class DropLegacyShipmentPartyColumns1784210975274
  implements MigrationInterface
{
  name = 'DropLegacyShipmentPartyColumns1784210975274';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "shipments" DROP CONSTRAINT "FK_shipments_shipper"
    `);
    await queryRunner.query(`
      ALTER TABLE "shipments" DROP CONSTRAINT "FK_shipments_consignee"
    `);
    await queryRunner.query(`
      ALTER TABLE "shipments" DROP CONSTRAINT "FK_shipments_notify_party"
    `);
    await queryRunner.query(`
      ALTER TABLE "shipments" DROP COLUMN "shipper_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "shipments" DROP COLUMN "consignee_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "shipments" DROP COLUMN "notify_party_id"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "shipments" ADD "notify_party_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "shipments" ADD "consignee_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "shipments" ADD "shipper_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "shipments" ADD CONSTRAINT "FK_shipments_notify_party" FOREIGN KEY ("notify_party_id") REFERENCES "parties"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "shipments" ADD CONSTRAINT "FK_shipments_consignee" FOREIGN KEY ("consignee_id") REFERENCES "parties"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "shipments" ADD CONSTRAINT "FK_shipments_shipper" FOREIGN KEY ("shipper_id") REFERENCES "parties"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }
}
