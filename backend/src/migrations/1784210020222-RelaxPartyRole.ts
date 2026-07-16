import { MigrationInterface, QueryRunner } from 'typeorm';

// Renames parties.role -> parties.default_role and drops its NOT NULL
// constraint: a party's actual role is now per-shipment via shipment_parties
// (a company can be a shipper on one shipment and a consignee on another),
// so the column on Party is just a UI hint for new-party forms.
export class RelaxPartyRole1784210020222 implements MigrationInterface {
  name = 'RelaxPartyRole1784210020222';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "parties" RENAME COLUMN "role" TO "default_role"
    `);
    await queryRunner.query(`
      ALTER TABLE "parties" ALTER COLUMN "default_role" DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "parties" ALTER COLUMN "default_role" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "parties" RENAME COLUMN "default_role" TO "role"
    `);
  }
}
