import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { CargoItem } from '../entities/cargo-item.entity';
import { DocumentStatus, ShipmentDocument } from '../entities/document.entity';
import { Shipment } from '../entities/shipment.entity';
import { ShipmentParty } from '../entities/shipment-party.entity';
import { DOC_TYPES } from './doc-type.constants';
import { DocumentsService } from './documents.service';
import { PdfGeneratorService } from './pdf-generator.service';
import { STORAGE_SERVICE } from './storage/storage.interface';

type MockRepo<T extends object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

const createMockRepo = <T extends object>(): MockRepo<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((v) => v),
  save: jest.fn(),
});

describe('DocumentsService', () => {
  let service: DocumentsService;
  let documentRepo: MockRepo<ShipmentDocument>;
  let shipmentRepo: MockRepo<Shipment>;
  let shipmentPartyRepo: MockRepo<ShipmentParty>;
  let cargoItemRepo: MockRepo<CargoItem>;
  let pdfGenerator: { generatePdf: jest.Mock };
  let storage: { save: jest.Mock; read: jest.Mock; exists: jest.Mock };

  const tenantId = 'tenant-1';

  beforeEach(async () => {
    pdfGenerator = { generatePdf: jest.fn().mockResolvedValue(Buffer.from('pdf')) };
    storage = {
      save: jest.fn().mockResolvedValue(undefined),
      read: jest.fn().mockResolvedValue(Buffer.from('pdf')),
      exists: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        {
          provide: getRepositoryToken(ShipmentDocument),
          useValue: createMockRepo(),
        },
        { provide: getRepositoryToken(Shipment), useValue: createMockRepo() },
        {
          provide: getRepositoryToken(ShipmentParty),
          useValue: createMockRepo(),
        },
        { provide: getRepositoryToken(CargoItem), useValue: createMockRepo() },
        { provide: PdfGeneratorService, useValue: pdfGenerator },
        { provide: STORAGE_SERVICE, useValue: storage },
      ],
    }).compile();

    service = module.get(DocumentsService);
    documentRepo = module.get(getRepositoryToken(ShipmentDocument));
    shipmentRepo = module.get(getRepositoryToken(Shipment));
    shipmentPartyRepo = module.get(getRepositoryToken(ShipmentParty));
    cargoItemRepo = module.get(getRepositoryToken(CargoItem));

    shipmentPartyRepo.find!.mockResolvedValue([]);
    cargoItemRepo.find!.mockResolvedValue([]);
  });

  describe('resolveTemplate (via generatePdf)', () => {
    it.each(DOC_TYPES.map((t) => t.value))(
      'accepts %s — a template is implemented for every canonical doc type',
      async (docType) => {
        shipmentRepo.findOne!.mockResolvedValue({
          id: 's1',
          shipment_number: 'SHP-1',
        } as Shipment);
        documentRepo.save!.mockImplementation(async (d) => ({ id: 'd1', ...d }));

        await expect(
          service.generatePdf(tenantId, 's1', { docType } as any),
        ).resolves.toBeDefined();
      },
    );

    it('rejects a docType outside the canonical list', async () => {
      await expect(
        service.generatePdf(tenantId, 's1', { docType: 'NOT_A_TYPE' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('never persists a DRAFT record for an unsupported docType', async () => {
      await expect(
        service.generatePdf(tenantId, 's1', { docType: 'NOT_A_TYPE' } as any),
      ).rejects.toThrow(BadRequestException);
      expect(documentRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('generatePdf', () => {
    beforeEach(() => {
      shipmentRepo.findOne!.mockResolvedValue({
        id: 's1',
        shipment_number: 'SHP-1',
      } as Shipment);
    });

    it('throws NotFoundException when the shipment does not exist', async () => {
      shipmentRepo.findOne!.mockResolvedValue(null);
      await expect(
        service.generatePdf(tenantId, 'missing', {
          docType: 'HOUSE_BILL_OF_LADING',
        } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates a DRAFT record, renders via PdfGeneratorService, saves via StorageService, then marks ISSUED', async () => {
      let savedDraft: ShipmentDocument | undefined;
      documentRepo.save!.mockImplementation(async (d) => {
        savedDraft = savedDraft ? { ...savedDraft, ...d } : { id: 'd1', ...d };
        return savedDraft;
      });

      const result = await service.generatePdf(tenantId, 's1', {
        docType: 'HOUSE_BILL_OF_LADING',
      } as any);

      // DRAFT created first
      expect(documentRepo.save).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ status: DocumentStatus.DRAFT }),
      );
      // PDF rendered
      expect(pdfGenerator.generatePdf).toHaveBeenCalledWith(
        'bill-of-lading',
        expect.any(Object),
      );
      // File persisted via storage abstraction
      expect(storage.save).toHaveBeenCalledWith(
        expect.stringContaining('HOUSE_BILL_OF_LADING'),
        expect.any(Buffer),
      );
      // Final state is ISSUED
      expect(result.status).toBe(DocumentStatus.ISSUED);
      expect(result.file_url).toBeDefined();
      expect(result.generated_at).toBeInstanceOf(Date);
    });
  });

  describe('voidDocument', () => {
    it('sets status to VOID', async () => {
      const existing = {
        id: 'd1',
        tenant_id: tenantId,
        status: DocumentStatus.ISSUED,
      } as ShipmentDocument;
      documentRepo.findOne!.mockResolvedValue(existing);
      documentRepo.save!.mockImplementation(async (d) => d);

      const result = await service.voidDocument(tenantId, 'd1');
      expect(result.status).toBe(DocumentStatus.VOID);
    });

    it('throws NotFoundException when the document does not exist', async () => {
      documentRepo.findOne!.mockResolvedValue(null);
      await expect(service.voidDocument(tenantId, 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll / findOne tenant scoping', () => {
    it('findAll scopes by tenant_id and supports shipmentId/status/docType filters', async () => {
      documentRepo.find!.mockResolvedValue([]);
      await service.findAll(tenantId, {
        shipmentId: 's1',
        status: DocumentStatus.ISSUED,
        docType: 'COMMERCIAL_INVOICE',
      });
      expect(documentRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenant_id: tenantId,
            shipment_id: 's1',
            status: DocumentStatus.ISSUED,
            doc_type: 'COMMERCIAL_INVOICE',
          },
        }),
      );
    });

    it('findOne throws NotFoundException outside the tenant', async () => {
      documentRepo.findOne!.mockResolvedValue(null);
      await expect(service.findOne(tenantId, 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('downloadFile', () => {
    it('throws NotFoundException when the document has no file_url yet', async () => {
      documentRepo.findOne!.mockResolvedValue({
        id: 'd1',
        tenant_id: tenantId,
        file_url: null,
      } as unknown as ShipmentDocument);
      await expect(service.downloadFile(tenantId, 'd1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when storage reports the file is missing', async () => {
      documentRepo.findOne!.mockResolvedValue({
        id: 'd1',
        tenant_id: tenantId,
        file_url: 'uploads/documents/x/y/z.pdf',
      } as ShipmentDocument);
      storage.exists.mockResolvedValue(false);
      await expect(service.downloadFile(tenantId, 'd1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('reads via StorageService and returns the trailing filename', async () => {
      documentRepo.findOne!.mockResolvedValue({
        id: 'd1',
        tenant_id: tenantId,
        file_url: 'uploads/documents/x/y/z.pdf',
      } as ShipmentDocument);

      const result = await service.downloadFile(tenantId, 'd1');
      expect(storage.read).toHaveBeenCalledWith('uploads/documents/x/y/z.pdf');
      expect(result.filename).toBe('z.pdf');
    });
  });
});
