import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { Party, PartyRole } from '../entities/party.entity';
import { PartiesService } from './parties.service';

type MockRepo = Partial<Record<keyof Repository<Party>, jest.Mock>>;

const createMockRepo = (): MockRepo => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

describe('PartiesService', () => {
  let service: PartiesService;
  let repo: MockRepo;

  const tenantId = 'tenant-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartiesService,
        { provide: getRepositoryToken(Party), useValue: createMockRepo() },
      ],
    }).compile();

    service = module.get(PartiesService);
    repo = module.get(getRepositoryToken(Party));
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

    it('filters by default_role when a role is given', async () => {
      repo.find!.mockResolvedValue([]);
      await service.findAll(tenantId, { role: PartyRole.SHIPPER });
      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenant_id: tenantId,
            default_role: PartyRole.SHIPPER,
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('returns the party when found within the tenant', async () => {
      const party = { id: 'p1', tenant_id: tenantId } as Party;
      repo.findOne!.mockResolvedValue(party);

      const result = await service.findOne(tenantId, 'p1');
      expect(result).toBe(party);
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: 'p1', tenant_id: tenantId },
      });
    });

    it('throws NotFoundException when no party matches', async () => {
      repo.findOne!.mockResolvedValue(null);
      await expect(service.findOne(tenantId, 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates a party scoped to the tenant with default_role from dto.role', async () => {
      const created = { id: 'new' } as Party;
      repo.create!.mockReturnValue(created);
      repo.save!.mockResolvedValue(created);

      const result = await service.create(tenantId, {
        name: 'Acme',
        role: PartyRole.CONSIGNEE,
      } as any);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: tenantId,
          name: 'Acme',
          default_role: PartyRole.CONSIGNEE,
        }),
      );
      expect(repo.save).toHaveBeenCalledWith(created);
      expect(result).toBe(created);
    });

    it('allows an omitted role (default_role stays null)', async () => {
      const created = { id: 'new' } as Party;
      repo.create!.mockReturnValue(created);
      repo.save!.mockResolvedValue(created);

      await service.create(tenantId, { name: 'No Role Co' } as any);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ default_role: null }),
      );
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the party does not exist', async () => {
      repo.findOne!.mockResolvedValue(null);
      await expect(
        service.update(tenantId, 'missing', { name: 'X' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('applies only the provided fields', async () => {
      const existing = {
        id: 'p1',
        tenant_id: tenantId,
        name: 'Old Name',
        default_role: PartyRole.SHIPPER,
        email: 'old@example.com',
      } as Party;
      repo.findOne!.mockResolvedValue(existing);
      repo.save!.mockImplementation(async (p) => p);

      const result = await service.update(tenantId, 'p1', {
        email: 'new@example.com',
      } as any);

      expect(result.name).toBe('Old Name');
      expect(result.email).toBe('new@example.com');
    });
  });
});
