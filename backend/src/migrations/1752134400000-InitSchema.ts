import { MigrationInterface, QueryRunner } from 'typeorm';

// Hand-written initial migration covering all entities under src/entities/.
// Not generated via `migration:generate` (no local empty Postgres instance
// was available when this was written) — review before running against
// production, and prefer regenerating via the CLI against an empty schema
// if you can spin up a disposable Postgres locally.
export class InitSchema1752134400000 implements MigrationInterface {
  name = 'InitSchema1752134400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE "tenants" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "slug" character varying NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_tenants_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_tenants" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."users_role_enum" AS ENUM ('ADMIN', 'AGENT', 'WAREHOUSE', 'CUSTOMER', 'VIEWER')
    `);
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "email" character varying NOT NULL,
        "password_hash" character varying NOT NULL,
        "first_name" character varying NOT NULL,
        "last_name" character varying NOT NULL,
        "role" "public"."users_role_enum" NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "users" ADD CONSTRAINT "FK_users_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."parties_role_enum" AS ENUM ('SHIPPER', 'CONSIGNEE', 'NOTIFY_PARTY', 'FREIGHT_FORWARDER', 'CUSTOMS_BROKER')
    `);
    await queryRunner.query(`
      CREATE TABLE "parties" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "name" character varying NOT NULL,
        "role" "public"."parties_role_enum" NOT NULL,
        "address" text,
        "city" character varying,
        "state" character varying,
        "country" character varying,
        "postal_code" character varying,
        "phone" character varying,
        "email" character varying,
        "tax_id" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_parties" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "parties" ADD CONSTRAINT "FK_parties_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."shipments_mode_enum" AS ENUM ('OCEAN', 'AIR', 'INLAND')
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."shipments_status_enum" AS ENUM ('DRAFT', 'BOOKED', 'IN_TRANSIT', 'CUSTOMS_HOLD', 'ARRIVED', 'DELIVERED', 'CANCELLED')
    `);
    await queryRunner.query(`
      CREATE TABLE "shipments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "shipment_number" character varying NOT NULL,
        "mode" "public"."shipments_mode_enum" NOT NULL,
        "status" "public"."shipments_status_enum" NOT NULL DEFAULT 'DRAFT',
        "origin_port" character varying NOT NULL,
        "destination_port" character varying NOT NULL,
        "etd" date,
        "eta" date,
        "vessel_name" character varying,
        "flight_number" character varying,
        "mawb_number" character varying,
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
        "shipper_id" uuid,
        "consignee_id" uuid,
        "notify_party_id" uuid,
        "created_by" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_shipments_shipment_number" UNIQUE ("shipment_number"),
        CONSTRAINT "PK_shipments" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "shipments" ADD CONSTRAINT "FK_shipments_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "shipments" ADD CONSTRAINT "FK_shipments_shipper" FOREIGN KEY ("shipper_id") REFERENCES "parties"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "shipments" ADD CONSTRAINT "FK_shipments_consignee" FOREIGN KEY ("consignee_id") REFERENCES "parties"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "shipments" ADD CONSTRAINT "FK_shipments_notify_party" FOREIGN KEY ("notify_party_id") REFERENCES "parties"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "shipments" ADD CONSTRAINT "FK_shipments_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // ShipmentDocument entity -> "documents" table (named to avoid shadowing the DOM Document type).
    await queryRunner.query(`
      CREATE TYPE "public"."documents_status_enum" AS ENUM ('DRAFT', 'ISSUED', 'SENT', 'SIGNED', 'VOID')
    `);
    await queryRunner.query(`
      CREATE TABLE "documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "shipment_id" uuid NOT NULL,
        "doc_type" character varying NOT NULL,
        "status" "public"."documents_status_enum" NOT NULL DEFAULT 'DRAFT',
        "file_url" character varying,
        "version" integer NOT NULL DEFAULT 1,
        "generated_at" TIMESTAMP,
        "sent_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_documents" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "documents" ADD CONSTRAINT "FK_documents_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "documents" ADD CONSTRAINT "FK_documents_shipment" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE TABLE "tracking_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "shipment_id" uuid NOT NULL,
        "event_code" character varying NOT NULL,
        "event_description" character varying NOT NULL,
        "location_name" character varying,
        "lat" numeric(10,7),
        "lng" numeric(10,7),
        "event_time" TIMESTAMP NOT NULL,
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tracking_events" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "tracking_events" ADD CONSTRAINT "FK_tracking_events_shipment" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."warehouse_entries_status_enum" AS ENUM ('IN_STORAGE', 'RELEASED')
    `);
    await queryRunner.query(`
      CREATE TABLE "warehouse_entries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "shipment_id" uuid,
        "customer_name" character varying NOT NULL,
        "batch_number" character varying NOT NULL,
        "lot_number" character varying,
        "num_pallets" integer NOT NULL,
        "weight_kg" numeric(12,3) NOT NULL,
        "is_hazmat" boolean NOT NULL DEFAULT false,
        "hazmat_class" character varying,
        "hazmat_un_number" character varying,
        "zone" character varying,
        "aisle" character varying,
        "rack" character varying,
        "level" character varying,
        "temp_min" numeric(5,2),
        "temp_max" numeric(5,2),
        "storage_start_date" date NOT NULL,
        "storage_end_date" date,
        "status" "public"."warehouse_entries_status_enum" NOT NULL DEFAULT 'IN_STORAGE',
        "movement_log" jsonb NOT NULL DEFAULT '[]',
        "released_at" TIMESTAMP,
        "released_by" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_warehouse_entries" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "warehouse_entries" ADD CONSTRAINT "FK_warehouse_entries_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "warehouse_entries" ADD CONSTRAINT "FK_warehouse_entries_shipment" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "warehouse_entries" DROP CONSTRAINT "FK_warehouse_entries_shipment"`);
    await queryRunner.query(`ALTER TABLE "warehouse_entries" DROP CONSTRAINT "FK_warehouse_entries_tenant"`);
    await queryRunner.query(`DROP TABLE "warehouse_entries"`);
    await queryRunner.query(`DROP TYPE "public"."warehouse_entries_status_enum"`);

    await queryRunner.query(`ALTER TABLE "tracking_events" DROP CONSTRAINT "FK_tracking_events_shipment"`);
    await queryRunner.query(`DROP TABLE "tracking_events"`);

    await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "FK_documents_shipment"`);
    await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "FK_documents_tenant"`);
    await queryRunner.query(`DROP TABLE "documents"`);
    await queryRunner.query(`DROP TYPE "public"."documents_status_enum"`);

    await queryRunner.query(`ALTER TABLE "shipments" DROP CONSTRAINT "FK_shipments_created_by"`);
    await queryRunner.query(`ALTER TABLE "shipments" DROP CONSTRAINT "FK_shipments_notify_party"`);
    await queryRunner.query(`ALTER TABLE "shipments" DROP CONSTRAINT "FK_shipments_consignee"`);
    await queryRunner.query(`ALTER TABLE "shipments" DROP CONSTRAINT "FK_shipments_shipper"`);
    await queryRunner.query(`ALTER TABLE "shipments" DROP CONSTRAINT "FK_shipments_tenant"`);
    await queryRunner.query(`DROP TABLE "shipments"`);
    await queryRunner.query(`DROP TYPE "public"."shipments_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."shipments_mode_enum"`);

    await queryRunner.query(`ALTER TABLE "parties" DROP CONSTRAINT "FK_parties_tenant"`);
    await queryRunner.query(`DROP TABLE "parties"`);
    await queryRunner.query(`DROP TYPE "public"."parties_role_enum"`);

    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_users_tenant"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);

    await queryRunner.query(`DROP TABLE "tenants"`);
  }
}
