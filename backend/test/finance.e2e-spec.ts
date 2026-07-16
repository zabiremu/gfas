import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { randomUUID } from 'crypto';
import { AppModule } from './../src/app.module';

describe('Finance (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;
  let shipmentId: string;
  let billToPartyId: string;
  let rateSheetId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const email = `e2e-finance-${randomUUID()}@example.com`;
    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        tenantName: `E2E Finance Tenant ${randomUUID()}`,
        email,
        password: 'password123',
        firstName: 'E2E',
        lastName: 'Finance',
      })
      .expect(201);
    token = registerRes.body.access_token;

    const partyRes = await request(app.getHttpServer())
      .post('/parties')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'E2E Finance Bill-To Co' })
      .expect(201);
    billToPartyId = partyRes.body.id;

    const shipmentRes = await request(app.getHttpServer())
      .post('/shipments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        mode: 'OCEAN',
        direction: 'EXPORT',
        originPort: 'USLAX',
        destinationPort: 'DEHAM',
        cargoItems: [
          {
            goodsDescription: 'E2E Finance Cargo',
            grossWeightKg: 2000,
            volumeCbm: 20,
            numPackages: 40,
            packageType: 'Boxes',
          },
        ],
      })
      .expect(201);
    shipmentId = shipmentRes.body.id;

    const rateSheetRes = await request(app.getHttpServer())
      .post('/rate-sheets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'E2E Rate Sheet',
        mode: 'OCEAN',
        effectiveFrom: '2026-01-01',
      })
      .expect(201);
    rateSheetId = rateSheetRes.body.id;

    await request(app.getHttpServer())
      .post(`/rate-sheets/${rateSheetId}/items`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        chargeCode: 'OCEAN_FREIGHT',
        description: 'Ocean Freight',
        rateBasis: 'PER_KG',
        rateAmount: 2,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/rate-sheets/${rateSheetId}/items`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        chargeCode: 'DOC_FEE',
        description: 'Documentation Fee',
        rateBasis: 'FLAT',
        rateAmount: 25,
      })
      .expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  it('generates an invoice from the shipment against the rate sheet, computing correct totals', async () => {
    const res = await request(app.getHttpServer())
      .post(`/invoices/generate/${shipmentId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rateSheetId, billToPartyId })
      .expect(201);

    // 2000kg * 2 (PER_KG) + 25 (FLAT) = 4025
    expect(Number(res.body.subtotal_amount)).toBe(4025);
    expect(Number(res.body.total_amount)).toBe(4025);
    expect(res.body.status).toBe('DRAFT');
    expect(res.body.lineItems).toHaveLength(2);
  });

  it('lists the generated invoice via GET /invoices filtered by shipmentId', async () => {
    const res = await request(app.getHttpServer())
      .get('/invoices')
      .query({ shipmentId })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].shipment_id).toBe(shipmentId);
  });
});
