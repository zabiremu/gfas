import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { RateBasis, RateSheetItem } from '../entities/rate-sheet-item.entity';
import { RateSheet } from '../entities/rate-sheet.entity';
import { ShipmentMode } from '../entities/shipment.entity';
import { RateSheetsService } from './rate-sheets.service';

type MockRepo<T extends object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

const createMockRepo = <T extends object>(): MockRepo<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((v) => v),
  save: jest.fn(),
  delete: jest.fn(),
});

describe('RateSheetsService', () => {
  let service: RateSheetsService;
  let rateSheetRepo: MockRepo<RateSheet>;
  let rateSheetItemRepo: MockRepo<RateSheetItem>;

  const tenantId = 'tenant-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateSheetsService,
        {
          provide: getRepositoryToken(RateSheet),
          useValue: createMockRepo(),
        },
        {
          provide: getRepositoryToken(RateSheetItem),
          useValue: createMockRepo(),
        },
      ],
    }).compile();

    service = module.get(RateSheetsService);
    rateSheetRepo = module.get(getRepositoryToken(RateSheet));
    rateSheetItemRepo = module.get(getRepositoryToken(RateSheetItem));
  });

  describe('findOne', () => {
    it('throws NotFoundException when no rate sheet matches the tenant', async () => {
      rateSheetRepo.findOne!.mockResolvedValue(null);
      await expect(service.findOne(tenantId, 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates a rate sheet scoped to the tenant, defaulting is_active to true', async () => {
      const created = { id: 'rs1' } as RateSheet;
      rateSheetRepo.save!.mockResolvedValue(created);

      await service.create(tenantId, {
        name: 'Test Sheet',
        mode: ShipmentMode.OCEAN,
        effectiveFrom: '2026-01-01',
      } as any);

      expect(rateSheetRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: tenantId,
          name: 'Test Sheet',
          is_active: true,
        }),
      );
    });
  });

  describe('addItem', () => {
    it('throws NotFoundException when the parent rate sheet is outside the tenant', async () => {
      rateSheetRepo.findOne!.mockResolvedValue(null);
      await expect(
        service.addItem(tenantId, 'missing', {
          chargeCode: 'X',
          description: 'X',
          rateBasis: RateBasis.FLAT,
          rateAmount: 10,
        } as any),
      ).rejects.toThrow(NotFoundException);
      expect(rateSheetItemRepo.save).not.toHaveBeenCalled();
    });

    it('creates an item linked to the rate sheet', async () => {
      rateSheetRepo.findOne!.mockResolvedValue({ id: 'rs1' } as RateSheet);
      rateSheetItemRepo.save!.mockImplementation(async (i) => i);

      const result = await service.addItem(tenantId, 'rs1', {
        chargeCode: 'OCEAN_FREIGHT',
        description: 'Ocean Freight',
        rateBasis: RateBasis.PER_KG,
        rateAmount: 0.5,
      } as any);

      expect(result).toMatchObject({
        rate_sheet_id: 'rs1',
        charge_code: 'OCEAN_FREIGHT',
        rate_basis: RateBasis.PER_KG,
      });
    });
  });

  describe('updateItem', () => {
    it('throws NotFoundException when the item does not belong to the rate sheet', async () => {
      rateSheetRepo.findOne!.mockResolvedValue({ id: 'rs1' } as RateSheet);
      rateSheetItemRepo.findOne!.mockResolvedValue(null);
      await expect(
        service.updateItem(tenantId, 'rs1', 'missing', {} as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('applies only the provided fields', async () => {
      rateSheetRepo.findOne!.mockResolvedValue({ id: 'rs1' } as RateSheet);
      const existing = {
        id: 'item-1',
        rate_amount: 10,
        description: 'Old',
      } as RateSheetItem;
      rateSheetItemRepo.findOne!.mockResolvedValue(existing);
      rateSheetItemRepo.save!.mockImplementation(async (i) => i);

      const result = await service.updateItem(tenantId, 'rs1', 'item-1', {
        rateAmount: 99,
      } as any);

      expect(result.rate_amount).toBe(99);
      expect(result.description).toBe('Old');
    });
  });

  describe('removeItem', () => {
    it('deletes scoped to both rate_sheet_id and item id', async () => {
      rateSheetRepo.findOne!.mockResolvedValue({ id: 'rs1' } as RateSheet);
      await service.removeItem(tenantId, 'rs1', 'item-1');
      expect(rateSheetItemRepo.delete).toHaveBeenCalledWith({
        id: 'item-1',
        rate_sheet_id: 'rs1',
      });
    });
  });
});
