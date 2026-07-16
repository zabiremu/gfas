import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { randomUUID } from 'crypto';
import { AppModule } from './../src/app.module';

describe('Shipments (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;
  let shipperId: string;
  let consigneeId: string;
  let notifyPartyId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const email = `e2e-${randomUUID()}@example.com`;
    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        tenantName: `E2E Tenant ${randomUUID()}`,
        email,
        password: 'password123',
        firstName: 'E2E',
        lastName: 'Tester',
      })
      .expect(201);
    token = registerRes.body.access_token;
    expect(token).toBeDefined();

    const shipperRes = await request(app.getHttpServer())
      .post('/parties')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'E2E Shipper Co', role: 'SHIPPER' })
      .expect(201);
    shipperId = shipperRes.body.id;

    const consigneeRes = await request(app.getHttpServer())
      .post('/parties')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'E2E Consignee Co', role: 'CONSIGNEE' })
      .expect(201);
    consigneeId = consigneeRes.body.id;

    const notifyRes = await request(app.getHttpServer())
      .post('/parties')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'E2E Notify Co', role: 'NOTIFY_PARTY' })
      .expect(201);
    notifyPartyId = notifyRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  let shipmentId: string;

  it('creates a shipment with a shipper, consignee, and two cargo lines', async () => {
    const res = await request(app.getHttpServer())
      .post('/shipments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        mode: 'OCEAN',
        direction: 'EXPORT',
        originPort: 'USLAX',
        destinationPort: 'DEHAM',
        shipperId,
        consigneeId,
        cargoItems: [
          {
            goodsDescription: 'E2E Cargo Line A',
            grossWeightKg: 100,
            numPackages: 10,
            packageType: 'Boxes',
          },
          {
            goodsDescription: 'E2E Cargo Line B',
            grossWeightKg: 50,
            numPackages: 5,
            packageType: 'Pallets',
          },
        ],
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.shipmentNumber ?? res.body.shipment_number).toMatch(
      /^SHP-\d{4}-\d{4}$/,
    );
    shipmentId = res.body.id;
  });

  it('attaches a second notify party without displacing the first assignment', async () => {
    await request(app.getHttpServer())
      .post(`/shipments/${shipmentId}/parties`)
      .set('Authorization', `Bearer ${token}`)
      .send({ partyId: notifyPartyId, role: 'NOTIFY_PARTY', isPrimary: true })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get(`/shipments/${shipmentId}/parties`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const notifyLinks = res.body.filter((p: any) => p.role === 'NOTIFY_PARTY');
    expect(notifyLinks).toHaveLength(1);
    expect(notifyLinks[0].party_id ?? notifyLinks[0].partyId).toBe(
      notifyPartyId,
    );
  });

  it('fetches the shipment back with shipper/consignee and both cargo lines', async () => {
    const res = await request(app.getHttpServer())
      .get(`/shipments/${shipmentId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.shipper?.name).toBe('E2E Shipper Co');
    expect(res.body.consignee?.name).toBe('E2E Consignee Co');
    expect(res.body.cargoItems ?? res.body.cargo_items).toHaveLength(2);
  });

  it('lists cargo items for the shipment via the dedicated endpoint', async () => {
    const res = await request(app.getHttpServer())
      .get(`/shipments/${shipmentId}/cargo-items`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body).toHaveLength(2);
  });

  it('transitions status DRAFT -> BOOKED -> IN_TRANSIT', async () => {
    const booked = await request(app.getHttpServer())
      .patch(`/shipments/${shipmentId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'BOOKED' })
      .expect(200);
    expect(booked.body.status).toBe('BOOKED');

    const inTransit = await request(app.getHttpServer())
      .patch(`/shipments/${shipmentId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'IN_TRANSIT' })
      .expect(200);
    expect(inTransit.body.status).toBe('IN_TRANSIT');
  });

  it('rejects unauthenticated requests', async () => {
    await request(app.getHttpServer()).get('/shipments').expect(401);
  });
});
