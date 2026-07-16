import { MigrationInterface, QueryRunner } from 'typeorm';

// Drops the cargo fields that used to be inlined on shipments now that
// cargo_items is the sole read/write path (cut over in the prior
// migration/step) — final cleanup of the cargo-line-items refactor.
export class DropInlinedCargoColumns1784212188678
  implements MigrationInterface
{
  name = 'DropInlinedCargoColumns1784212188678';

  private readonly columns = [
    'goods_description',
    'hs_code',
    'country_of_origin',
    'gross_weight_kg',
    'volume_cbm',
    'num_packages',
    'package_type',
    'declared_value_usd',
    'is_hazmat',
    'hazmat_un_number',
    'hazmat_proper_shipping_name',
    'hazmat_class',
    'hazmat_packing_group',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const column of this.columns) {
      await queryRunner.query(
        `ALTER TABLE "shipments" DROP COLUMN "${column}"`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "shipments" ADD "goods_description" text`);
    await queryRunner.query(`ALTER TABLE "shipments" ADD "hs_code" character varying`);
    await queryRunner.query(`ALTER TABLE "shipments" ADD "country_of_origin" character varying`);
    await queryRunner.query(`ALTER TABLE "shipments" ADD "gross_weight_kg" numeric(12,3)`);
    await queryRunner.query(`ALTER TABLE "shipments" ADD "volume_cbm" numeric(12,3)`);
    await queryRunner.query(`ALTER TABLE "shipments" ADD "num_packages" integer`);
    await queryRunner.query(`ALTER TABLE "shipments" ADD "package_type" character varying`);
    await queryRunner.query(`ALTER TABLE "shipments" ADD "declared_value_usd" numeric(14,2)`);
    await queryRunner.query(`ALTER TABLE "shipments" ADD "is_hazmat" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "shipments" ADD "hazmat_un_number" character varying`);
    await queryRunner.query(`ALTER TABLE "shipments" ADD "hazmat_proper_shipping_name" character varying`);
    await queryRunner.query(`ALTER TABLE "shipments" ADD "hazmat_class" character varying`);
    await queryRunner.query(`ALTER TABLE "shipments" ADD "hazmat_packing_group" character varying`);
  }
}
