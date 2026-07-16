import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { CargoItem } from '../entities/cargo-item.entity';
import { PartyRole } from '../entities/party.entity';
import {
  Shipment,
  ShipmentDirection,
  ShipmentMode,
  ShipmentStatus,
} from '../entities/shipment.entity';
import { ShipmentParty } from '../entities/shipment-party.entity';
import { TrackingEvent } from '../entities/tracking-event.entity';
import { ShipmentsService } from './shipments.service';

type MockRepo<T extends object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

const createMockRepo = <T extends object>(): MockRepo<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((v) => v),
  save: jest.fn(),
  count: jest.fn(),
  delete: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
});

describe('ShipmentsService', () => {
  let service: ShipmentsService;
  let shipmentRepo: MockRepo<Shipment>;
  let trackingRepo: MockRepo<TrackingEvent>;
  let shipmentPartyRepo: MockRepo<ShipmentParty>;
  let cargoItemRepo: MockRepo<CargoItem>;

  const tenantId = 'tenant-1';
  const userId = 'user-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShipmentsService,
        { provide: getRepositoryToken(Shipment), useValue: createMockRepo() },
        {
          provide: getRepositoryToken(TrackingEvent),
          useValue: createMockRepo(),
        },
        {
          provide: getRepositoryToken(ShipmentParty),
          useValue: createMockRepo(),
        },
        {
          provide: getRepositoryToken(CargoItem),
          useValue: createMockRepo(),
        },
      ],
    }).compile();

    service = module.get(ShipmentsService);
    shipmentRepo = module.get(getRepositoryToken(Shipment));
    trackingRepo = module.get(getRepositoryToken(TrackingEvent));
    shipmentPartyRepo = module.get(getRepositoryToken(ShipmentParty));
    cargoItemRepo = module.get(getRepositoryToken(CargoItem));

    // Defaults so attachPrimaryParties()/cargoItems lookups don't blow up.
    shipmentPartyRepo.find!.mockResolvedValue([]);
    cargoItemRepo.find!.mockResolvedValue([]);
  });

  describe('findOne', () => {
    it('throws NotFoundException when no shipment matches the tenant', async () => {
      shipmentRepo.findOne!.mockResolvedValue(null);
      await expect(service.findOne(tenantId, 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('scopes the query by tenant_id and loads cargoItems/documents/trackingEvents', async () => {
      const shipment = { id: 's1', tenant_id: tenantId } as Shipment;
      shipmentRepo.findOne!.mockResolvedValue(shipment);

      await service.findOne(tenantId, 's1');
      expect(shipmentRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 's1', tenant_id: tenantId },
          relations: expect.objectContaining({
            cargoItems: true,
            documents: true,
            trackingEvents: true,
          }),
        }),
      );
    });

    it('attaches primary shipper/consignee/notifyParty from shipment_parties', async () => {
      const shipment = { id: 's1', tenant_id: tenantId } as Shipment;
      shipmentRepo.findOne!.mockResolvedValue(shipment);
      shipmentPartyRepo.find!.mockResolvedValue([
        {
          shipment_id: 's1',
          role: PartyRole.SHIPPER,
          party: { id: 'p1', name: 'Shipper Co' },
        },
        {
          shipment_id: 's1',
          role: PartyRole.CONSIGNEE,
          party: { id: 'p2', name: 'Consignee Co' },
        },
      ]);

      const result = await service.findOne(tenantId, 's1');
      expect(result.shipper).toMatchObject({ name: 'Shipper Co' });
      expect(result.consignee).toMatchObject({ name: 'Consignee Co' });
      expect(result.notifyParty).toBeNull();
    });
  });

  describe('create', () => {
    const baseDto = {
      mode: ShipmentMode.OCEAN,
      direction: ShipmentDirection.EXPORT,
      originPort: 'USLAX',
      destinationPort: 'DEHAM',
    };

    beforeEach(() => {
      shipmentRepo.count!.mockResolvedValue(0);
      shipmentRepo.save!.mockImplementation(async (s) => ({
        id: 's-new',
        ...s,
      }));
      shipmentPartyRepo.findOne!.mockResolvedValue(null);
      shipmentPartyRepo.save!.mockResolvedValue(undefined);
    });

    it('creates the shipment scoped to the tenant with a generated shipment_number', async () => {
      const result = await service.create(tenantId, userId, {
        ...baseDto,
        goodsDescription: 'Widgets',
        grossWeightKg: 100,
        numPackages: 5,
        packageType: 'Boxes',
      } as any);

      expect(shipmentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: tenantId,
          created_by: userId,
          shipment_number: expect.stringMatching(/^SHP-\d{4}-\d{4}$/),
        }),
      );
      expect(result.id).toBe('s-new');
    });

    it('creates a primary shipment_parties row per given role', async () => {
      await service.create(tenantId, userId, {
        ...baseDto,
        goodsDescription: 'Widgets',
        grossWeightKg: 100,
        numPackages: 5,
        packageType: 'Boxes',
        shipperId: 'party-1',
        consigneeId: 'party-2',
      } as any);

      expect(shipmentPartyRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          party_id: 'party-1',
          role: PartyRole.SHIPPER,
          is_primary: true,
        }),
      );
      expect(shipmentPartyRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          party_id: 'party-2',
          role: PartyRole.CONSIGNEE,
          is_primary: true,
        }),
      );
    });

    it('builds a single primary cargo item from the deprecated flat fields', async () => {
      await service.create(tenantId, userId, {
        ...baseDto,
        goodsDescription: 'Widgets',
        grossWeightKg: 100,
        numPackages: 5,
        packageType: 'Boxes',
      } as any);

      expect(cargoItemRepo.delete).toHaveBeenCalledWith({
        shipment_id: 's-new',
      });
      expect(cargoItemRepo.save).toHaveBeenCalledWith([
        expect.objectContaining({
          is_primary: true,
          goods_description: 'Widgets',
          gross_weight_kg: 100,
        }),
      ]);
    });

    it('prefers the cargoItems array over flat fields, marking only the first line primary', async () => {
      await service.create(tenantId, userId, {
        ...baseDto,
        cargoItems: [
          {
            goodsDescription: 'Line A',
            grossWeightKg: 10,
            numPackages: 1,
            packageType: 'Box',
          },
          {
            goodsDescription: 'Line B',
            grossWeightKg: 20,
            numPackages: 2,
            packageType: 'Box',
          },
        ],
      } as any);

      const savedItems = cargoItemRepo.save!.mock.calls[0][0];
      expect(savedItems).toHaveLength(2);
      expect(savedItems[0]).toMatchObject({
        goods_description: 'Line A',
        is_primary: true,
      });
      expect(savedItems[1]).toMatchObject({
        goods_description: 'Line B',
        is_primary: false,
      });
    });

    it('creates no cargo items when neither cargoItems nor flat fields are given', async () => {
      await service.create(tenantId, userId, { ...baseDto } as any);
      expect(cargoItemRepo.delete).not.toHaveBeenCalled();
      expect(cargoItemRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the shipment does not exist', async () => {
      shipmentRepo.findOne!.mockResolvedValue(null);
      await expect(
        service.update(tenantId, 'missing', {} as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('applies only the provided top-level fields', async () => {
      const existing = {
        id: 's1',
        tenant_id: tenantId,
        origin_port: 'OLD',
        destination_port: 'OLD-DEST',
      } as Shipment;
      shipmentRepo.findOne!.mockResolvedValue(existing);
      shipmentRepo.save!.mockImplementation(async (s) => s);

      const result = await service.update(tenantId, 's1', {
        originPort: 'NEW',
      } as any);

      expect(result.origin_port).toBe('NEW');
      expect(result.destination_port).toBe('OLD-DEST');
    });

    it('replaces all cargo items when an explicit cargoItems array is given', async () => {
      const existing = { id: 's1', tenant_id: tenantId } as Shipment;
      shipmentRepo.findOne!.mockResolvedValue(existing);
      shipmentRepo.save!.mockImplementation(async (s) => s);

      await service.update(tenantId, 's1', {
        cargoItems: [
          {
            goodsDescription: 'Replacement line',
            grossWeightKg: 5,
            numPackages: 1,
            packageType: 'Box',
          },
        ],
      } as any);

      expect(cargoItemRepo.delete).toHaveBeenCalledWith({ shipment_id: 's1' });
      expect(cargoItemRepo.save).toHaveBeenCalled();
    });

    it('patches only the primary cargo item when a flat cargo field is given without an array', async () => {
      const existing = { id: 's1', tenant_id: tenantId } as Shipment;
      shipmentRepo.findOne!.mockResolvedValue(existing);
      shipmentRepo.save!.mockImplementation(async (s) => s);
      const existingCargo = {
        id: 'c1',
        goods_description: 'Old',
        gross_weight_kg: 1,
      } as CargoItem;
      cargoItemRepo.findOne!.mockResolvedValue(existingCargo);
      cargoItemRepo.save!.mockImplementation(async (c) => c);

      await service.update(tenantId, 's1', { grossWeightKg: 999 } as any);

      expect(cargoItemRepo.delete).not.toHaveBeenCalled();
      expect(cargoItemRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ gross_weight_kg: 999, id: 'c1' }),
      );
    });

    it('does not touch cargo items when no cargo fields are provided', async () => {
      const existing = { id: 's1', tenant_id: tenantId } as Shipment;
      shipmentRepo.findOne!.mockResolvedValue(existing);
      shipmentRepo.save!.mockImplementation(async (s) => s);

      await service.update(tenantId, 's1', { status: ShipmentStatus.BOOKED } as any);

      expect(cargoItemRepo.delete).not.toHaveBeenCalled();
      expect(cargoItemRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('multi-party-per-role support', () => {
    it('attachShipmentParty allows a second party for a role already occupied', async () => {
      shipmentPartyRepo.findOne!.mockResolvedValue(null); // no existing link for this exact party+role
      shipmentPartyRepo.save!.mockImplementation(async (p) => p);

      const result = await service.attachShipmentParty(tenantId, 's1', {
        partyId: 'party-2',
        role: PartyRole.NOTIFY_PARTY,
        isPrimary: false,
      } as any);

      expect(result).toMatchObject({
        party_id: 'party-2',
        role: PartyRole.NOTIFY_PARTY,
        is_primary: false,
      });
    });

    it('marking a new party primary clears the previous primary for that role', async () => {
      shipmentPartyRepo.findOne!.mockResolvedValue(null);
      shipmentPartyRepo.save!.mockImplementation(async (p) => p);
      shipmentPartyRepo.update!.mockResolvedValue(undefined);

      await service.attachShipmentParty(tenantId, 's1', {
        partyId: 'party-3',
        role: PartyRole.NOTIFY_PARTY,
        isPrimary: true,
      } as any);

      expect(shipmentPartyRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          shipment_id: 's1',
          role: PartyRole.NOTIFY_PARTY,
          is_primary: true,
        }),
        { is_primary: false },
      );
    });

    it('detachShipmentParty deletes by shipment/party (and role if given)', async () => {
      await service.detachShipmentParty(tenantId, 's1', 'party-1', PartyRole.SHIPPER);
      expect(shipmentPartyRepo.delete).toHaveBeenCalledWith({
        tenant_id: tenantId,
        shipment_id: 's1',
        party_id: 'party-1',
        role: PartyRole.SHIPPER,
      });
    });
  });

  describe('cargo item sub-resource CRUD', () => {
    it('addCargoItem marks the first line primary and subsequent lines non-primary', async () => {
      cargoItemRepo.count!.mockResolvedValueOnce(0);
      cargoItemRepo.save!.mockImplementation(async (c) => c);
      const first = await service.addCargoItem(tenantId, 's1', {
        goodsDescription: 'A',
        grossWeightKg: 1,
        numPackages: 1,
        packageType: 'Box',
      } as any);
      expect(first).toMatchObject({ is_primary: true });

      cargoItemRepo.count!.mockResolvedValueOnce(1);
      const second = await service.addCargoItem(tenantId, 's1', {
        goodsDescription: 'B',
        grossWeightKg: 2,
        numPackages: 1,
        packageType: 'Box',
      } as any);
      expect(second).toMatchObject({ is_primary: false });
    });

    it('updateCargoItem throws NotFoundException when the item does not exist', async () => {
      cargoItemRepo.findOne!.mockResolvedValue(null);
      await expect(
        service.updateCargoItem(tenantId, 's1', 'missing', {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('throws NotFoundException when the shipment does not exist', async () => {
      shipmentRepo.findOne!.mockResolvedValue(null);
      await expect(
        service.updateStatus(tenantId, 'missing', ShipmentStatus.BOOKED),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates the status', async () => {
      const existing = {
        id: 's1',
        tenant_id: tenantId,
        status: ShipmentStatus.DRAFT,
      } as Shipment;
      shipmentRepo.findOne!.mockResolvedValue(existing);
      shipmentRepo.save!.mockImplementation(async (s) => s);

      const result = await service.updateStatus(
        tenantId,
        's1',
        ShipmentStatus.BOOKED,
      );
      expect(result.status).toBe(ShipmentStatus.BOOKED);
    });
  });
});
