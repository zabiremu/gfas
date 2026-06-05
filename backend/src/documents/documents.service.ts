import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { mkdirSync, writeFileSync } from 'fs';
import { join, sep } from 'path';
import { FindOptionsWhere, Repository } from 'typeorm';
import { ShipmentDocument, DocumentStatus } from '../entities/document.entity';
import { Party } from '../entities/party.entity';
import { Shipment } from '../entities/shipment.entity';
import { GenerateDocumentDto } from './dto/generate-document.dto';
import { PdfGeneratorService } from './pdf-generator.service';

/** Maps a logical document type to its Handlebars template file name. */
const TEMPLATE_BY_DOC_TYPE: Record<string, string> = {
  HOUSE_BILL_OF_LADING: 'bill-of-lading',
  COMMERCIAL_INVOICE: 'commercial-invoice',
};

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(ShipmentDocument)
    private readonly documentRepository: Repository<ShipmentDocument>,
    @InjectRepository(Shipment)
    private readonly shipmentRepository: Repository<Shipment>,
    private readonly pdfGenerator: PdfGeneratorService,
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

  async generatePdf(
    tenantId: string,
    shipmentId: string,
    dto: GenerateDocumentDto,
  ): Promise<ShipmentDocument> {
    // Validate the doc type up front so we never persist an orphan DRAFT record
    // for an unsupported template.
    this.resolveTemplate(dto.docType);

    const shipment = await this.shipmentRepository.findOne({
      where: { id: shipmentId, tenant_id: tenantId },
      relations: { shipper: true, consignee: true, notifyParty: true },
    });
    if (!shipment) {
      throw new NotFoundException(`Shipment ${shipmentId} not found`);
    }

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
    const pdfBuffer = await this.generatePdfFile(shipment, dto.docType);

    // 3. Persist the file to the local filesystem.
    const timestamp = Date.now();
    const relativeDir = join('uploads', 'documents', tenantId, shipmentId);
    const relativePath = join(relativeDir, `${dto.docType}-${timestamp}.pdf`);
    mkdirSync(join(process.cwd(), relativeDir), { recursive: true });
    writeFileSync(join(process.cwd(), relativePath), pdfBuffer);

    // 4. Mark as issued.
    document.status = DocumentStatus.ISSUED;
    document.file_url = relativePath.split(sep).join('/');
    document.generated_at = new Date();
    return this.documentRepository.save(document);
  }

  async generatePdfFile(shipment: Shipment, docType: string): Promise<Buffer> {
    const templateName = this.resolveTemplate(docType);

    const declaredValue = Number(shipment.declared_value_usd) || 0;
    const unitPrice =
      shipment.num_packages > 0 && declaredValue > 0
        ? this.formatMoney(declaredValue / shipment.num_packages)
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

      goodsDescription: shipment.goods_description,
      hsCode: shipment.hs_code ?? '—',
      countryOfOrigin: shipment.country_of_origin ?? '—',
      numPackages: shipment.num_packages,
      packageType: shipment.package_type,
      grossWeightKg: shipment.gross_weight_kg,
      volumeCbm: shipment.volume_cbm ?? '—',
      declaredValueUsd: this.formatMoney(shipment.declared_value_usd),

      // Commercial-invoice specific figures.
      unitPrice,
      subtotal: this.formatMoney(declaredValue),
      freightCost: '0.00',
      insuranceCost: '0.00',
      totalAmount: this.formatMoney(declaredValue),

      // Bill-of-lading specific.
      freightTerms: 'FREIGHT PREPAID',

      isHazmat: shipment.is_hazmat,
      hazmatUnNumber: shipment.hazmat_un_number ?? '—',
      hazmatProperShippingName: shipment.hazmat_proper_shipping_name ?? '—',
      hazmatClass: shipment.hazmat_class ?? '—',
      hazmatPackingGroup: shipment.hazmat_packing_group ?? '—',
    };

    return this.pdfGenerator.generatePdf(templateName, data);
  }

  private resolveTemplate(docType: string): string {
    const templateName = TEMPLATE_BY_DOC_TYPE[docType];
    if (!templateName) {
      throw new BadRequestException(
        `Unsupported docType '${docType}'. Supported: ${Object.keys(
          TEMPLATE_BY_DOC_TYPE,
        ).join(', ')}`,
      );
    }
    return templateName;
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
