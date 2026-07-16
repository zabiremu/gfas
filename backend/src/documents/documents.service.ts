import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { join, sep } from 'path';
import { FindOptionsWhere, IsNull, Repository } from 'typeorm';
import { CargoItem } from '../entities/cargo-item.entity';
import { DocumentTemplate } from '../entities/document-template.entity';
import { ShipmentDocument, DocumentStatus } from '../entities/document.entity';
import { Party, PartyRole } from '../entities/party.entity';
import { Shipment } from '../entities/shipment.entity';
import { ShipmentParty } from '../entities/shipment-party.entity';
import { DOC_TYPES } from './doc-type.constants';
import { GenerateDocumentDto } from './dto/generate-document.dto';
import { PdfGeneratorService } from './pdf-generator.service';
import { STORAGE_SERVICE, type StorageService } from './storage/storage.interface';

/** Maps a logical document type to its Handlebars template file name. */
const TEMPLATE_BY_DOC_TYPE: Record<string, string> = {
  HOUSE_BILL_OF_LADING: 'bill-of-lading',
  MASTER_BILL_OF_LADING: 'master-bill-of-lading',
  AIR_WAYBILL: 'air-waybill',
  COMMERCIAL_INVOICE: 'commercial-invoice',
  PROFORMA_INVOICE: 'proforma-invoice',
  PACKING_LIST: 'packing-list',
  CERTIFICATE_OF_ORIGIN: 'certificate-of-origin',
  IMO_DGD: 'imo-dgd',
};

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(ShipmentDocument)
    private readonly documentRepository: Repository<ShipmentDocument>,
    @InjectRepository(Shipment)
    private readonly shipmentRepository: Repository<Shipment>,
    @InjectRepository(ShipmentParty)
    private readonly shipmentPartyRepository: Repository<ShipmentParty>,
    @InjectRepository(CargoItem)
    private readonly cargoItemRepository: Repository<CargoItem>,
    @InjectRepository(DocumentTemplate)
    private readonly templateRepository: Repository<DocumentTemplate>,
    private readonly pdfGenerator: PdfGeneratorService,
    @Inject(STORAGE_SERVICE)
    private readonly storage: StorageService,
  ) {}

  async findAll(
    tenantId: string,
    query?: { shipmentId?: string; status?: DocumentStatus; docType?: string },
  ): Promise<ShipmentDocument[]> {
    const where: FindOptionsWhere<ShipmentDocument> = { tenant_id: tenantId };
    if (query?.shipmentId) {
      where.shipment_id = query.shipmentId;
    }
    if (query?.status) {
      where.status = query.status;
    }
    if (query?.docType) {
      where.doc_type = query.docType;
    }

    return this.documentRepository.find({
      where,
      relations: { shipment: true },
      order: { created_at: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<ShipmentDocument> {
    const document = await this.documentRepository.findOne({
      where: { id, tenant_id: tenantId },
      relations: { shipment: true },
    });
    if (!document) {
      throw new NotFoundException(`Document ${id} not found`);
    }
    return document;
  }

  async voidDocument(tenantId: string, id: string): Promise<ShipmentDocument> {
    const document = await this.findOne(tenantId, id);
    document.status = DocumentStatus.VOID;
    return this.documentRepository.save(document);
  }

  async downloadFile(
    tenantId: string,
    id: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const document = await this.findOne(tenantId, id);
    if (!document.file_url) {
      throw new NotFoundException('Document has not been generated yet');
    }
    if (!(await this.storage.exists(document.file_url))) {
      throw new NotFoundException('Generated file is missing in storage');
    }
    const buffer = await this.storage.read(document.file_url);
    return { buffer, filename: document.file_url.split('/').pop()! };
  }

  async generatePdf(
    tenantId: string,
    shipmentId: string,
    dto: GenerateDocumentDto,
  ): Promise<ShipmentDocument> {
    // Validate the doc type up front so we never persist an orphan DRAFT record
    // for an unsupported template.
    await this.resolveTemplate(tenantId, dto.docType);

    const shipment = await this.shipmentRepository.findOne({
      where: { id: shipmentId, tenant_id: tenantId },
    });
    if (!shipment) {
      throw new NotFoundException(`Shipment ${shipmentId} not found`);
    }
    await this.attachPrimaryParties(tenantId, shipment);
    const cargoItems = await this.cargoItemRepository.find({
      where: { tenant_id: tenantId, shipment_id: shipmentId },
      order: { is_primary: 'DESC', created_at: 'ASC' },
    });

    // 1. Create the document record in DRAFT.
    const document = await this.documentRepository.save(
      this.documentRepository.create({
        tenant_id: tenantId,
        shipment_id: shipmentId,
        doc_type: dto.docType,
        status: DocumentStatus.DRAFT,
      }),
    );

    // 2. Render the PDF.
    const pdfBuffer = await this.generatePdfFile(
      tenantId,
      shipment,
      dto.docType,
      cargoItems,
    );

    // 3. Persist the file via the configured storage driver (local disk by
    // default; STORAGE_DRIVER=minio for the S3-compatible driver).
    const timestamp = Date.now();
    const relativeDir = join('uploads', 'documents', tenantId, shipmentId);
    const relativePath = join(relativeDir, `${dto.docType}-${timestamp}.pdf`)
      .split(sep)
      .join('/');
    await this.storage.save(relativePath, pdfBuffer);

    // 4. Mark as issued.
    document.status = DocumentStatus.ISSUED;
    document.file_url = relativePath;
    document.generated_at = new Date();
    return this.documentRepository.save(document);
  }

  async generatePdfFile(
    tenantId: string,
    shipment: Shipment,
    docType: string,
    cargoItems: CargoItem[],
  ): Promise<Buffer> {
    const { cacheKey, loadSource } = await this.resolveTemplate(
      tenantId,
      docType,
    );

    // Single-line templates (bill of lading, invoice, certificates) render
    // off the primary line; multi-line templates (packing list) use the
    // full `cargoItems` array also included in `data`.
    const primary = cargoItems.find((c) => c.is_primary) ?? cargoItems[0];

    const declaredValue = Number(primary?.declared_value_usd) || 0;
    const unitPrice =
      primary && primary.num_packages > 0 && declaredValue > 0
        ? this.formatMoney(declaredValue / primary.num_packages)
        : '0.00';

    const data: Record<string, unknown> = {
      shipmentNumber: shipment.shipment_number,
      issuedDate: this.formatDate(new Date()),

      shipper: this.toPartyData(shipment.shipper),
      consignee: this.toPartyData(shipment.consignee),
      notifyParty: this.toPartyData(shipment.notifyParty),

      vesselName: shipment.vessel_name ?? '—',
      originPort: shipment.origin_port,
      destinationPort: shipment.destination_port,
      etd: this.formatDate(shipment.etd),
      eta: this.formatDate(shipment.eta),
      mode: shipment.mode,
      mawbNumber: shipment.mawb_number ?? '—',
      flightNumber: shipment.flight_number ?? '—',

      goodsDescription: primary?.goods_description ?? '—',
      hsCode: primary?.hs_code ?? '—',
      countryOfOrigin: primary?.country_of_origin ?? '—',
      numPackages: primary?.num_packages ?? 0,
      packageType: primary?.package_type ?? '—',
      grossWeightKg: primary?.gross_weight_kg ?? 0,
      volumeCbm: primary?.volume_cbm ?? '—',
      declaredValueUsd: this.formatMoney(primary?.declared_value_usd),

      // Commercial-invoice specific figures.
      unitPrice,
      subtotal: this.formatMoney(declaredValue),
      freightCost: '0.00',
      insuranceCost: '0.00',
      totalAmount: this.formatMoney(declaredValue),

      // Bill-of-lading specific.
      freightTerms: 'FREIGHT PREPAID',

      isHazmat: primary?.is_hazmat ?? false,
      hazmatUnNumber: primary?.hazmat_un_number ?? '—',
      hazmatProperShippingName: primary?.hazmat_proper_shipping_name ?? '—',
      hazmatClass: primary?.hazmat_class ?? '—',
      hazmatPackingGroup: primary?.hazmat_packing_group ?? '—',

      // Multi-line cargo, for templates that iterate it (e.g. packing list).
      cargoItems: cargoItems.map((c) => ({
        description: c.goods_description,
        hsCode: c.hs_code ?? '—',
        numPackages: c.num_packages,
        packageType: c.package_type,
        grossWeightKg: c.gross_weight_kg,
        volumeCbm: c.volume_cbm ?? '—',
      })),
      cargoTotals: {
        numPackages: cargoItems.reduce((sum, c) => sum + c.num_packages, 0),
        grossWeightKg: cargoItems.reduce(
          (sum, c) => sum + Number(c.gross_weight_kg),
          0,
        ),
      },
    };

    return this.pdfGenerator.generatePdf(cacheKey, loadSource, data);
  }

  // Populates the (non-persisted) shipper/consignee/notifyParty relations on
  // the shipment from shipment_parties instead of the legacy shipper_id/
  // consignee_id/notify_party_id FK columns, which are no longer read from.
  private async attachPrimaryParties(
    tenantId: string,
    shipment: Shipment,
  ): Promise<void> {
    const links = await this.shipmentPartyRepository.find({
      where: {
        tenant_id: tenantId,
        shipment_id: shipment.id,
        is_primary: true,
      },
      relations: { party: true },
    });
    shipment.shipper =
      links.find((l) => l.role === PartyRole.SHIPPER)?.party ?? null;
    shipment.consignee =
      links.find((l) => l.role === PartyRole.CONSIGNEE)?.party ?? null;
    shipment.notifyParty =
      links.find((l) => l.role === PartyRole.NOTIFY_PARTY)?.party ?? null;
  }

  // Resolution priority: tenant-specific active DB template > system-default
  // (tenant_id null) active DB template > on-disk .hbs file. The cache key
  // encodes the DB row's id+version so bumping `version` on update forces a
  // recompile without needing a separate invalidation call on the read path.
  private async resolveTemplate(
    tenantId: string,
    docType: string,
  ): Promise<{ cacheKey: string; loadSource: () => string }> {
    const tenantTemplate = await this.templateRepository.findOne({
      where: {
        tenant_id: tenantId,
        document_type: docType as DocumentTemplate['document_type'],
        is_active: true,
      },
      order: { version: 'DESC' },
    });
    if (tenantTemplate) {
      return {
        cacheKey: `db:${tenantTemplate.id}:${tenantTemplate.version}`,
        loadSource: () => tenantTemplate.handlebars_body,
      };
    }

    const systemTemplate = await this.templateRepository.findOne({
      where: {
        tenant_id: IsNull(),
        document_type: docType as DocumentTemplate['document_type'],
        is_active: true,
      },
      order: { version: 'DESC' },
    });
    if (systemTemplate) {
      return {
        cacheKey: `db:${systemTemplate.id}:${systemTemplate.version}`,
        loadSource: () => systemTemplate.handlebars_body,
      };
    }

    const fileName = TEMPLATE_BY_DOC_TYPE[docType];
    if (!fileName) {
      const known = DOC_TYPES.map((t) => t.value).join(', ');
      throw new BadRequestException(
        `Unsupported docType '${docType}'. Known types: ${known}. Of these, ` +
          `only the following have templates implemented: ${Object.keys(
            TEMPLATE_BY_DOC_TYPE,
          ).join(', ')}.`,
      );
    }
    return {
      cacheKey: `file:${fileName}`,
      loadSource: () => this.pdfGenerator.readFileTemplateSource(fileName),
    };
  }

  // Updates a DB-backed template's body, bumping its version so any cached
  // compiled template under the old cache key is orphaned, and explicitly
  // evicts that old entry rather than leaving it to fall out of the map.
  async updateTemplateBody(
    id: string,
    newBody: string,
  ): Promise<DocumentTemplate> {
    const template = await this.templateRepository.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException(`Document template ${id} not found`);
    }
    const oldCacheKey = `db:${template.id}:${template.version}`;
    template.handlebars_body = newBody;
    template.version += 1;
    const saved = await this.templateRepository.save(template);
    this.pdfGenerator.invalidate(oldCacheKey);
    return saved;
  }

  private toPartyData(party: Party | null) {
    if (!party) {
      return null;
    }
    return {
      name: party.name,
      address: party.address ?? '',
      city: party.city ?? '',
      state: party.state ?? '',
      country: party.country ?? '',
      phone: party.phone ?? '',
      email: party.email ?? '',
    };
  }

  private formatDate(value: Date | string | null | undefined): string {
    if (!value) {
      return '—';
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  }

  private formatMoney(value: number | string | null | undefined): string {
    const num = Number(value);
    if (value === null || value === undefined || Number.isNaN(num)) {
      return '0.00';
    }
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
}
