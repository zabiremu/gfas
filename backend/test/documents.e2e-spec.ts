import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { randomUUID } from 'crypto';
import { AppModule } from './../src/app.module';

describe('Documents (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;
  let shipmentId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const email = `e2e-docs-${randomUUID()}@example.com`;
    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        tenantName: `E2E Docs Tenant ${randomUUID()}`,
        email,
        password: 'password123',
        firstName: 'E2E',
        lastName: 'Docs',
      })
      .expect(201);
    token = registerRes.body.access_token;

    const shipperRes = await request(app.getHttpServer())
      .post('/parties')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'E2E Docs Shipper', role: 'SHIPPER' })
      .expect(201);

    const consigneeRes = await request(app.getHttpServer())
      .post('/parties')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'E2E Docs Consignee', role: 'CONSIGNEE' })
      .expect(201);

    const shipmentRes = await request(app.getHttpServer())
      .post('/shipments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        mode: 'OCEAN',
        direction: 'EXPORT',
        originPort: 'USLAX',
        destinationPort: 'DEHAM',
        shipperId: shipperRes.body.id,
        consigneeId: consigneeRes.body.id,
        goodsDescription: 'E2E Document Test Cargo',
        grossWeightKg: 500,
        numPackages: 20,
        packageType: 'Cartons',
      })
      .expect(201);
    shipmentId = shipmentRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  let documentId: string;

  it('generates a document and marks it ISSUED', async () => {
    const res = await request(app.getHttpServer())
      .post(`/documents/generate/${shipmentId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ docType: 'HOUSE_BILL_OF_LADING' })
      .expect(201);

    expect(res.body.status).toBe('ISSUED');
    expect(res.body.file_url ?? res.body.fileUrl).toBeDefined();
    documentId = res.body.id;
  });

  it('rejects an unsupported docType without persisting a DRAFT record', async () => {
    await request(app.getHttpServer())
      .post(`/documents/generate/${shipmentId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ docType: 'NOT_A_REAL_TYPE' })
      .expect(400);
  });

  it('downloads the generated document as a PDF', async () => {
    const res = await request(app.getHttpServer())
      .get(`/documents/${documentId}/download`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.headers['content-type']).toContain('application/pdf');
  });

  it('lists documents filtered by shipmentId', async () => {
    const res = await request(app.getHttpServer())
      .get('/documents')
      .query({ shipmentId })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body.every((d: any) => d.shipment_id === shipmentId)).toBe(true);
  });

  it('voids a document', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/documents/${documentId}/void`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.status).toBe('VOID');
  });
});
