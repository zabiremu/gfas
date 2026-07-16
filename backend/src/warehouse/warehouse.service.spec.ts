import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { WarehouseEntry, WarehouseStatus } from '../entities/warehouse.entity';
import { WarehouseService } from './warehouse.service';

type MockRepo = Partial<Record<keyof Repository<WarehouseEntry>, jest.Mock>>;

const createMockRepo = (): MockRepo => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

describe('WarehouseService', () => {
  let service: WarehouseService;
  let repo: MockRepo;

  const tenantId = 'tenant-1';
  const userEmail = 'agent@example.com';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarehouseService,
        {
          provide: getRepositoryToken(WarehouseEntry),
          useValue: createMockRepo(),
        },
      ],
    }).compile();

    service = module.get(WarehouseService);
    repo = module.get(getRepositoryToken(WarehouseEntry));
  });

  describe('findAll', () => {
    it('scopes the query by tenant_id', async () => {
      repo.find!.mockResolvedValue([]);
      await service.findAll(tenantId);
      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenant_id: tenantId }),
        }),
      );
    });

    it('filters by status when given', async () => {
      repo.find!.mockResolvedValue([]);
      await service.findAll(tenantId, { status: WarehouseStatus.RELEASED });
      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenant_id: tenantId,
            status: WarehouseStatus.RELEASED,
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when no entry matches', async () => {
      repo.findOne!.mockResolvedValue(null);
      await expect(service.findOne(tenantId, 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates an entry with warehouse_id, IN_STORAGE status, and a RECEIVED log entry', async () => {
      const created = { id: 'w1' } as WarehouseEntry;
      repo.create!.mockReturnValue(created);
      repo.save!.mockResolvedValue(created);

      const dto = {
        warehouseId: 'wh-1',
        customerName: 'Acme',
        batchNumber: 'B-1',
        numPallets: 5,
        weightKg: 100,
        storageStartDate: '2026-01-01',
      };
      const result = await service.create(tenantId, userEmail, dto as any);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: tenantId,
          warehouse_id: 'wh-1',
          status: WarehouseStatus.IN_STORAGE,
          movement_log: [
            expect.objectContaining({ step: 1, action: 'RECEIVED' }),
          ],
        }),
      );
      expect(result).toBe(created);
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the entry does not exist', async () => {
      repo.findOne!.mockResolvedValue(null);
      await expect(
        service.update(tenantId, 'missing', userEmail, {} as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('appends a NOTE log entry when a note is provided', async () => {
      const existing = {
        id: 'w1',
        tenant_id: tenantId,
        movement_log: [{ step: 1, action: 'RECEIVED' }],
      } as unknown as WarehouseEntry;
      repo.findOne!.mockResolvedValue(existing);
      repo.save!.mockImplementation(async (e) => e);

      const result = await service.update(tenantId, 'w1', userEmail, {
        note: 'Checked in',
      } as any);

      expect(result.movement_log).toHaveLength(2);
      expect(result.movement_log[1]).toMatchObject({
        step: 2,
        action: 'NOTE',
        note: 'Checked in',
      });
    });
  });

  describe('release', () => {
    it('sets status to RELEASED and logs a RELEASED entry', async () => {
      const existing = {
        id: 'w1',
        tenant_id: tenantId,
        status: WarehouseStatus.IN_STORAGE,
        movement_log: [{ step: 1, action: 'RECEIVED' }],
      } as unknown as WarehouseEntry;
      repo.findOne!.mockResolvedValue(existing);
      repo.save!.mockImplementation(async (e) => e);

      const result = await service.release(
        tenantId,
        'w1',
        'user-1',
        userEmail,
      );

      expect(result.status).toBe(WarehouseStatus.RELEASED);
      expect(result.released_by).toBe('user-1');
      expect(result.movement_log).toHaveLength(2);
      expect(result.movement_log[1]).toMatchObject({ action: 'RELEASED' });
    });

    it('is idempotent — returns unchanged if already released', async () => {
      const existing = {
        id: 'w1',
        tenant_id: tenantId,
        status: WarehouseStatus.RELEASED,
        movement_log: [{ step: 1, action: 'RECEIVED' }],
      } as unknown as WarehouseEntry;
      repo.findOne!.mockResolvedValue(existing);

      const result = await service.release(
        tenantId,
        'w1',
        'user-1',
        userEmail,
      );

      expect(result).toBe(existing);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });
});
