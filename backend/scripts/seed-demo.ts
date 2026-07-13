/**
 * Amovix demo seed script.
 *
 * Connects directly to PostgreSQL with the `pg` driver (no Nest bootstrap) and
 * populates a single demo tenant with users, parties, shipments, documents,
 * tracking events and a warehouse entry.
 *
 * Prerequisite: the backend must have been started at least once so TypeORM
 * (synchronize: true) has created the tables.
 *
 * Run with:  npm run seed:demo
 */
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcryptjs';
import { Client } from 'pg';

// Load backend/.env (also loaded by the npm script, harmless to repeat).
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// ---------------------------------------------------------------------------
// Deterministic IDs so the script is re-runnable and rows are easy to relate.
// ---------------------------------------------------------------------------
const TENANT_ID = '11111111-1111-1111-1111-111111111111';

const USER = {
  admin: '22222222-2222-2222-2222-222222222221',
  agent: '22222222-2222-2222-2222-222222222222',
  warehouse: '22222222-2222-2222-2222-222222222223',
};

const PARTY = {
  acme: '33333333-3333-3333-3333-333333333331',
  euroGoods: '33333333-3333-3333-3333-333333333332',
  pacificRim: '33333333-3333-3333-3333-333333333333',
  shanghai: '33333333-3333-3333-3333-333333333334',
  brazil: '33333333-3333-3333-3333-333333333335',
};

const SHIP = {
  s1: '44444444-4444-4444-4444-444444444441',
  s2: '44444444-4444-4444-4444-444444444442',
  s3: '44444444-4444-4444-4444-444444444443',
  s4: '44444444-4444-4444-4444-444444444444',
  s5: '44444444-4444-4444-4444-444444444445',
};

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Ensure backend/.env exists and contains DATABASE_URL.',
    );
  }

  const client = new Client({ connectionString });
  await client.connect();
  console.log('✅ Connected to PostgreSQL');

  try {
    await client.query('BEGIN');

    // -- Cleanup (idempotent re-run) -------------------------------------
    console.log('🧹 Clearing existing demo data for tenant...');
    await client.query(
      `DELETE FROM tracking_events
       WHERE shipment_id IN (SELECT id FROM shipments WHERE tenant_id = $1)`,
      [TENANT_ID],
    );
    await client.query(`DELETE FROM documents WHERE tenant_id = $1`, [
      TENANT_ID,
    ]);
    await client.query(`DELETE FROM warehouse_entries WHERE tenant_id = $1`, [
      TENANT_ID,
    ]);
    await client.query(`DELETE FROM shipments WHERE tenant_id = $1`, [
      TENANT_ID,
    ]);
    await client.query(`DELETE FROM parties WHERE tenant_id = $1`, [TENANT_ID]);
    await client.query(`DELETE FROM users WHERE tenant_id = $1`, [TENANT_ID]);
    await client.query(`DELETE FROM tenants WHERE id = $1`, [TENANT_ID]);

    // -- Tenant ----------------------------------------------------------
    console.log('🏢 Inserting tenant...');
    await client.query(
      `INSERT INTO tenants (id, name, slug, is_active)
       VALUES ($1, $2, $3, $4)`,
      [TENANT_ID, 'Global Trade Partners LLC', 'global-trade-partners', true],
    );

    // -- Users -----------------------------------------------------------
    console.log('👤 Inserting users...');
    const users = [
      {
        id: USER.admin,
        email: 'admin@gtp.com',
        password: 'Admin@123',
        firstName: 'Sarah',
        lastName: 'Mitchell',
        role: 'ADMIN',
      },
      {
        id: USER.agent,
        email: 'agent@gtp.com',
        password: 'Agent@123',
        firstName: 'James',
        lastName: 'Carter',
        role: 'AGENT',
      },
      {
        id: USER.warehouse,
        email: 'warehouse@gtp.com',
        password: 'Ware@123',
        firstName: 'Maria',
        lastName: 'Santos',
        role: 'WAREHOUSE',
      },
    ];
    for (const u of users) {
      await client.query(
        `INSERT INTO users
           (id, tenant_id, email, password_hash, first_name, last_name, role, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          u.id,
          TENANT_ID,
          u.email,
          bcrypt.hashSync(u.password, 10),
          u.firstName,
          u.lastName,
          u.role,
          true,
        ],
      );
      console.log(`   • ${u.role.padEnd(9)} ${u.email}`);
    }

    // -- Parties ---------------------------------------------------------
    console.log('🤝 Inserting parties...');
    const parties = [
      {
        id: PARTY.acme,
        name: 'Acme International Export LLC',
        role: 'SHIPPER',
        address: '450 Harbor Blvd',
        city: 'Newark',
        state: 'NJ',
        country: 'USA',
        postalCode: '07102',
        phone: '+1 (201) 555-0100',
        email: 'exports@acme-intl.com',
      },
      {
        id: PARTY.euroGoods,
        name: 'EuroGoods GmbH',
        role: 'CONSIGNEE',
        address: 'Hafenstrasse 42',
        city: 'Hamburg',
        state: null,
        country: 'Germany',
        postalCode: '20359',
        phone: null,
        email: 'imports@eurogoods.de',
      },
      {
        id: PARTY.pacificRim,
        name: 'Pacific Rim Trading Co.',
        role: 'SHIPPER',
        address: '800 W 6th St',
        city: 'Los Angeles',
        state: 'CA',
        country: 'USA',
        postalCode: null,
        phone: '+1 (213) 555-0200',
        email: 'trade@pacificrim.com',
      },
      {
        id: PARTY.shanghai,
        name: 'Shanghai Free Trade Zone Imports',
        role: 'CONSIGNEE',
        address: '1 Yanggao Rd, Pudong',
        city: 'Shanghai',
        state: null,
        country: 'China',
        postalCode: null,
        phone: null,
        email: 'imports@shftz.cn',
      },
      {
        id: PARTY.brazil,
        name: 'Brazil Industrial Chemicals SA',
        role: 'CONSIGNEE',
        address: 'Rua Santos Dumont 500',
        city: 'Santos',
        state: 'SP',
        country: 'Brazil',
        postalCode: null,
        phone: null,
        email: 'imports@bics.com.br',
      },
    ];
    for (const p of parties) {
      await client.query(
        `INSERT INTO parties
           (id, tenant_id, name, role, address, city, state, country, postal_code, phone, email)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          p.id,
          TENANT_ID,
          p.name,
          p.role,
          p.address,
          p.city,
          p.state,
          p.country,
          p.postalCode,
          p.phone,
          p.email,
        ],
      );
      console.log(`   • ${p.role.padEnd(9)} ${p.name}`);
    }

    // -- Shipments -------------------------------------------------------
    console.log('🚢 Inserting shipments...');
    const shipments = [
      {
        id: SHIP.s1,
        number: 'SHP-2025-0001',
        mode: 'OCEAN',
        status: 'IN_TRANSIT',
        originPort: 'USNWK',
        destinationPort: 'DEHAM',
        etd: '2025-06-17',
        eta: '2025-06-28',
        vesselName: 'MSC GÜLSÜN',
        flightNumber: null,
        mawbNumber: null,
        goodsDescription: 'Industrial Machinery Parts and Components',
        hsCode: '8431.49',
        countryOfOrigin: 'USA',
        grossWeightKg: 12500,
        volumeCbm: 45.5,
        numPackages: 24,
        packageType: 'Pallets',
        declaredValueUsd: 185000,
        isHazmat: false,
        hazmatUnNumber: null,
        hazmatProperShippingName: null,
        hazmatClass: null,
        hazmatPackingGroup: null,
        shipperId: PARTY.acme,
        consigneeId: PARTY.euroGoods,
      },
      {
        id: SHIP.s2,
        number: 'SHP-2025-0002',
        mode: 'AIR',
        status: 'BOOKED',
        originPort: 'JFK',
        destinationPort: 'FRA',
        etd: '2025-06-20',
        eta: '2025-06-21',
        vesselName: null,
        flightNumber: 'LH401',
        mawbNumber: '020-12345678',
        goodsDescription: 'Electronic Components and Semiconductors',
        hsCode: '8542.31',
        countryOfOrigin: 'USA',
        grossWeightKg: 850,
        volumeCbm: 3.2,
        numPackages: 48,
        packageType: 'Cartons',
        declaredValueUsd: 420000,
        isHazmat: false,
        hazmatUnNumber: null,
        hazmatProperShippingName: null,
        hazmatClass: null,
        hazmatPackingGroup: null,
        shipperId: PARTY.acme,
        consigneeId: PARTY.euroGoods,
      },
      {
        id: SHIP.s3,
        number: 'SHP-2025-0003',
        mode: 'OCEAN',
        status: 'CUSTOMS_HOLD',
        originPort: 'USLAX',
        destinationPort: 'CNSHA',
        etd: '2025-06-10',
        eta: '2025-07-02',
        vesselName: 'COSCO SHIPPING UNIVERSE',
        flightNumber: null,
        mawbNumber: null,
        goodsDescription: 'Isopropanol - Industrial Solvent',
        hsCode: '2905.12',
        countryOfOrigin: 'USA',
        grossWeightKg: 18000,
        volumeCbm: 22.0,
        numPackages: 120,
        packageType: 'Drums',
        declaredValueUsd: 95000,
        isHazmat: true,
        hazmatUnNumber: 'UN1219',
        hazmatProperShippingName: 'ISOPROPANOL',
        hazmatClass: '3',
        hazmatPackingGroup: 'II',
        shipperId: PARTY.pacificRim,
        consigneeId: PARTY.shanghai,
      },
      {
        id: SHIP.s4,
        number: 'SHP-2025-0004',
        mode: 'INLAND',
        status: 'DELIVERED',
        originPort: 'Newark NJ',
        destinationPort: 'Chicago IL',
        etd: '2025-06-12',
        eta: '2025-06-15',
        vesselName: null,
        flightNumber: null,
        mawbNumber: null,
        goodsDescription: 'Consumer Electronics - Retail Boxes',
        hsCode: '8471.30',
        countryOfOrigin: 'China',
        grossWeightKg: 3200,
        volumeCbm: 18.5,
        numPackages: 200,
        packageType: 'Cartons',
        declaredValueUsd: 78000,
        isHazmat: false,
        hazmatUnNumber: null,
        hazmatProperShippingName: null,
        hazmatClass: null,
        hazmatPackingGroup: null,
        shipperId: PARTY.acme,
        consigneeId: PARTY.euroGoods,
      },
      {
        id: SHIP.s5,
        number: 'SHP-2025-0005',
        mode: 'OCEAN',
        status: 'DRAFT',
        originPort: 'USHOU',
        destinationPort: 'BRSSZ',
        etd: null,
        eta: '2025-07-20',
        vesselName: null,
        flightNumber: null,
        mawbNumber: null,
        goodsDescription: 'Chemical Raw Materials',
        hsCode: null,
        countryOfOrigin: null,
        grossWeightKg: 9500,
        volumeCbm: null,
        numPackages: 60,
        packageType: 'IBC Tanks',
        declaredValueUsd: null,
        isHazmat: false,
        hazmatUnNumber: null,
        hazmatProperShippingName: null,
        hazmatClass: null,
        hazmatPackingGroup: null,
        shipperId: null,
        consigneeId: PARTY.brazil,
      },
    ];
    for (const s of shipments) {
      await client.query(
        `INSERT INTO shipments (
           id, tenant_id, shipment_number, mode, status, origin_port, destination_port,
           etd, eta, vessel_name, flight_number, mawb_number, goods_description, hs_code,
           country_of_origin, gross_weight_kg, volume_cbm, num_packages, package_type,
           declared_value_usd, is_hazmat, hazmat_un_number, hazmat_proper_shipping_name,
           hazmat_class, hazmat_packing_group, shipper_id, consignee_id, notify_party_id,
           created_by
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
           $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
         )`,
        [
          s.id,
          TENANT_ID,
          s.number,
          s.mode,
          s.status,
          s.originPort,
          s.destinationPort,
          s.etd,
          s.eta,
          s.vesselName,
          s.flightNumber,
          s.mawbNumber,
          s.goodsDescription,
          s.hsCode,
          s.countryOfOrigin,
          s.grossWeightKg,
          s.volumeCbm,
          s.numPackages,
          s.packageType,
          s.declaredValueUsd,
          s.isHazmat,
          s.hazmatUnNumber,
          s.hazmatProperShippingName,
          s.hazmatClass,
          s.hazmatPackingGroup,
          s.shipperId,
          s.consigneeId,
          null, // notify_party_id
          USER.admin, // created_by (NOT NULL)
        ],
      );
      console.log(`   • ${s.number} (${s.mode}/${s.status})`);
    }

    // -- Documents -------------------------------------------------------
    console.log('📄 Inserting documents...');
    const now = new Date();
    const documents = [
      // SHP-2025-0001
      { shipmentId: SHIP.s1, docType: 'HOUSE_BILL_OF_LADING', status: 'ISSUED', generated: true, sent: false },
      { shipmentId: SHIP.s1, docType: 'COMMERCIAL_INVOICE', status: 'ISSUED', generated: true, sent: false },
      { shipmentId: SHIP.s1, docType: 'PACKING_LIST', status: 'SENT', generated: true, sent: true },
      { shipmentId: SHIP.s1, docType: 'CERTIFICATE_OF_ORIGIN', status: 'DRAFT', generated: false, sent: false },
      // SHP-2025-0003 (hazmat)
      { shipmentId: SHIP.s3, docType: 'IMO_DGD', status: 'ISSUED', generated: true, sent: false },
      { shipmentId: SHIP.s3, docType: 'HOUSE_BILL_OF_LADING', status: 'ISSUED', generated: true, sent: false },
    ];
    for (const d of documents) {
      await client.query(
        `INSERT INTO documents
           (tenant_id, shipment_id, doc_type, status, version, generated_at, sent_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          TENANT_ID,
          d.shipmentId,
          d.docType,
          d.status,
          1,
          d.generated ? now : null,
          d.sent ? now : null,
        ],
      );
      console.log(`   • ${d.docType.padEnd(22)} ${d.status}`);
    }

    // -- Tracking events (SHP-2025-0001) ---------------------------------
    console.log('📍 Inserting tracking events...');
    const trackingEvents = [
      {
        code: 'BOOKING_CONFIRMED',
        description: 'Booking confirmed by freight forwarder',
        location: 'Newark, NJ',
        lat: null,
        lng: null,
        time: '2025-06-14 09:00:00',
      },
      {
        code: 'CARGO_RECEIVED',
        description: 'Cargo received at origin warehouse',
        location: 'Newark Port, NJ',
        lat: 40.684,
        lng: -74.1496,
        time: '2025-06-15 14:30:00',
      },
      {
        code: 'DEPARTED_ORIGIN',
        description: 'Vessel departed origin port',
        location: 'Port Newark-Elizabeth, NJ',
        lat: 40.684,
        lng: -74.1496,
        time: '2025-06-17 06:00:00',
      },
      {
        code: 'IN_TRANSIT',
        description: 'Vessel in transit - Atlantic Ocean',
        location: 'Atlantic Ocean',
        lat: 45.2,
        lng: -40.5,
        time: '2025-06-21 12:00:00',
      },
      {
        code: 'APPROACHING_DESTINATION',
        description: 'Vessel approaching Hamburg',
        location: 'North Sea',
        lat: 54.8,
        lng: 7.2,
        time: '2025-06-26 08:00:00',
      },
    ];
    for (const e of trackingEvents) {
      await client.query(
        `INSERT INTO tracking_events
           (shipment_id, event_code, event_description, location_name, lat, lng, event_time)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [SHIP.s1, e.code, e.description, e.location, e.lat, e.lng, e.time],
      );
      console.log(`   • ${e.code}`);
    }

    // -- Warehouse entry (linked to SHP-2025-0003) -----------------------
    console.log('🏬 Inserting warehouse entry...');
    const movementLog = [
      {
        step: 1,
        action: 'RECEIVED',
        location: 'Receiving Dock B',
        time: '2025-06-14T10:00:00Z',
        logged_by: 'Maria Santos',
      },
      {
        step: 2,
        action: 'INSPECTED',
        location: 'Inspection Area B',
        time: '2025-06-14T11:30:00Z',
        logged_by: 'Maria Santos',
      },
      {
        step: 3,
        action: 'PLACED',
        location: 'Zone B, Aisle 12, Rack 4, Level 2',
        time: '2025-06-14T13:00:00Z',
        logged_by: 'Maria Santos',
      },
    ];
    await client.query(
      `INSERT INTO warehouse_entries (
         tenant_id, shipment_id, customer_name, batch_number, lot_number, num_pallets,
         weight_kg, is_hazmat, hazmat_class, hazmat_un_number, zone, aisle, rack, level,
         temp_min, temp_max, storage_start_date, storage_end_date, status, movement_log
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
         $19, $20
       )`,
      [
        TENANT_ID,
        SHIP.s3,
        'Acme International Export LLC',
        'BATCH-2025-0612-A',
        'LOT-4421-B',
        12,
        8400,
        true,
        '3',
        'UN1219',
        'B',
        '12',
        '4',
        '2',
        15,
        25,
        '2025-06-14',
        '2025-07-14',
        'IN_STORAGE',
        JSON.stringify(movementLog),
      ],
    );
    console.log('   • BATCH-2025-0612-A');

    await client.query('COMMIT');
    console.log('\n🎉 Demo seed complete!');
    console.log('   Tenant : Global Trade Partners LLC');
    console.log('   Login  : admin@gtp.com / Admin@123');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Seed failed — transaction rolled back.');
    console.error(err instanceof Error ? err.message : err);
    console.error(
      '\nHint: start the backend once (npm run start:dev) so TypeORM creates the tables, then retry.',
    );
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
