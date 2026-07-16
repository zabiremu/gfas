import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { CargoItem } from '../entities/cargo-item.entity';
import { Invoice, InvoiceStatus } from '../entities/invoice.entity';
import { InvoiceLineItem } from '../entities/invoice-line-item.entity';
import { RateBasis, RateSheetItem } from '../entities/rate-sheet-item.entity';
import { RateSheet } from '../entities/rate-sheet.entity';
import { InvoicesService } from './invoices.service';

type MockRepo<T extends object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

const createMockRepo = <T extends object>(): MockRepo<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((v) => v),
  save: jest.fn(),
  count: jest.fn(),
});

describe('InvoicesService', () => {
  let service: InvoicesService;
  let invoiceRepo: MockRepo<Invoice>;
  let lineItemRepo: MockRepo<InvoiceLineItem>;
  let cargoItemRepo: MockRepo<CargoItem>;
  let rateSheetRepo: MockRepo<RateSheet>;

  const tenantId = 'tenant-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: getRepositoryToken(Invoice), useValue: createMockRepo() },
        {
          provide: getRepositoryToken(InvoiceLineItem),
          useValue: createMockRepo(),
        },
        { provide: getRepositoryToken(CargoItem), useValue: createMockRepo() },
        { provide: getRepositoryToken(RateSheet), useValue: createMockRepo() },
      ],
    }).compile();

    service = module.get(InvoicesService);
    invoiceRepo = module.get(getRepositoryToken(Invoice));
    lineItemRepo = module.get(getRepositoryToken(InvoiceLineItem));
    cargoItemRepo = module.get(getRepositoryToken(CargoItem));
    rateSheetRepo = module.get(getRepositoryToken(RateSheet));

    invoiceRepo.count!.mockResolvedValue(0);
  });

  describe('findOne', () => {
    it('throws NotFoundException when no invoice matches the tenant', async () => {
      invoiceRepo.findOne!.mockResolvedValue(null);
      await expect(service.findOne(tenantId, 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('scopes by tenant_id and supports shipmentId/status filters', async () => {
      invoiceRepo.find!.mockResolvedValue([]);
      await service.findAll(tenantId, {
        shipmentId: 's1',
        status: InvoiceStatus.SENT,
      });
      expect(invoiceRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenant_id: tenantId,
            shipment_id: 's1',
            status: InvoiceStatus.SENT,
          },
        }),
      );
    });
  });

  describe('create', () => {
    it('creates a DRAFT invoice with a generated invoice_number', async () => {
      invoiceRepo.save!.mockImplementation(async (i) => ({ id: 'inv-1', ...i }));

      const result = await service.create(tenantId, {
        billToPartyId: 'party-1',
        issueDate: '2026-01-01',
      } as any);

      expect(invoiceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: tenantId,
          status: InvoiceStatus.DRAFT,
          invoice_number: expect.stringMatching(/^INV-\d{4}-\d{4}$/),
        }),
      );
      expect(result.id).toBe('inv-1');
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the invoice does not exist', async () => {
      invoiceRepo.findOne!.mockResolvedValue(null);
      await expect(
        service.update(tenantId, 'missing', {} as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('applies only the provided fields', async () => {
      const existing = {
        id: 'inv-1',
        tenant_id: tenantId,
        status: InvoiceStatus.DRAFT,
        notes: 'old',
      } as Invoice;
      invoiceRepo.findOne!.mockResolvedValue(existing);
      invoiceRepo.save!.mockImplementation(async (i) => i);

      const result = await service.update(tenantId, 'inv-1', {
        status: InvoiceStatus.SENT,
      } as any);

      expect(result.status).toBe(InvoiceStatus.SENT);
      expect(result.notes).toBe('old');
    });
  });

  describe('generateFromShipment', () => {
    const cargoItems = [
      {
        gross_weight_kg: 1000,
        volume_cbm: 10,
        num_packages: 50,
      } as CargoItem,
      {
        gross_weight_kg: 500,
        volume_cbm: 5,
        num_packages: 25,
      } as CargoItem,
    ];

    beforeEach(() => {
      cargoItemRepo.find!.mockResolvedValue(cargoItems);
      invoiceRepo.save!.mockImplementation(async (i) => ({ id: 'inv-1', ...i }));
      lineItemRepo.save!.mockImplementation(async (items) => items);
    });

    it('throws NotFoundException when the rate sheet does not exist', async () => {
      rateSheetRepo.findOne!.mockResolvedValue(null);
      await expect(
        service.generateFromShipment(tenantId, 's1', 'missing', 'party-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('computes PER_KG against the summed cargo weight', async () => {
      rateSheetRepo.findOne!.mockResolvedValue({
        id: 'rs1',
        items: [
          {
            rate_basis: RateBasis.PER_KG,
            rate_amount: 2,
            min_charge: null,
            description: 'Ocean Freight',
            currency: 'USD',
          } as RateSheetItem,
        ],
      } as RateSheet);

      const result = await service.generateFromShipment(
        tenantId,
        's1',
        'rs1',
        'party-1',
      );

      // Total weight = 1000 + 500 = 1500kg; rate 2 => 3000
      expect(result.subtotal_amount).toBe(3000);
      expect(result.total_amount).toBe(3000);
    });

    it('computes PER_CBM against the summed cargo volume', async () => {
      rateSheetRepo.findOne!.mockResolvedValue({
        id: 'rs1',
        items: [
          {
            rate_basis: RateBasis.PER_CBM,
            rate_amount: 10,
            min_charge: null,
            description: 'THC',
            currency: 'USD',
          } as RateSheetItem,
        ],
      } as RateSheet);

      const result = await service.generateFromShipment(
        tenantId,
        's1',
        'rs1',
        'party-1',
      );

      // Total volume = 10 + 5 = 15 CBM; rate 10 => 150
      expect(result.subtotal_amount).toBe(150);
    });

    it('charges FLAT items exactly once regardless of cargo line count', async () => {
      rateSheetRepo.findOne!.mockResolvedValue({
        id: 'rs1',
        items: [
          {
            rate_basis: RateBasis.FLAT,
            rate_amount: 75,
            min_charge: null,
            description: 'Doc Fee',
            currency: 'USD',
          } as RateSheetItem,
        ],
      } as RateSheet);

      const result = await service.generateFromShipment(
        tenantId,
        's1',
        'rs1',
        'party-1',
      );

      expect(result.subtotal_amount).toBe(75);
    });

    it('applies min_charge as a floor when the computed amount is lower', async () => {
      rateSheetRepo.findOne!.mockResolvedValue({
        id: 'rs1',
        items: [
          {
            rate_basis: RateBasis.PER_PACKAGE,
            rate_amount: 0.1,
            min_charge: 20,
            description: 'Handling',
            currency: 'USD',
          } as RateSheetItem,
        ],
      } as RateSheet);

      const result = await service.generateFromShipment(
        tenantId,
        's1',
        'rs1',
        'party-1',
      );

      // Total packages = 50 + 25 = 75; 75 * 0.1 = 7.5, floored to min_charge 20
      expect(result.subtotal_amount).toBe(20);
    });

    it('sums multiple rate-sheet items into a single subtotal', async () => {
      rateSheetRepo.findOne!.mockResolvedValue({
        id: 'rs1',
        items: [
          {
            rate_basis: RateBasis.PER_KG,
            rate_amount: 1,
            min_charge: null,
            description: 'Freight',
            currency: 'USD',
          } as RateSheetItem,
          {
            rate_basis: RateBasis.FLAT,
            rate_amount: 50,
            min_charge: null,
            description: 'Doc Fee',
            currency: 'USD',
          } as RateSheetItem,
        ],
      } as RateSheet);

      const result = await service.generateFromShipment(
        tenantId,
        's1',
        'rs1',
        'party-1',
      );

      // 1500 (PER_KG) + 50 (FLAT) = 1550
      expect(result.subtotal_amount).toBe(1550);
    });
  });
});
