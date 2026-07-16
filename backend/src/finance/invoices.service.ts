import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { CargoItem } from '../entities/cargo-item.entity';
import { Invoice, InvoiceStatus } from '../entities/invoice.entity';
import { InvoiceLineItem } from '../entities/invoice-line-item.entity';
import { RateBasis, RateSheetItem } from '../entities/rate-sheet-item.entity';
import { RateSheet } from '../entities/rate-sheet.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceLineItem)
    private readonly lineItemRepository: Repository<InvoiceLineItem>,
    @InjectRepository(CargoItem)
    private readonly cargoItemRepository: Repository<CargoItem>,
    @InjectRepository(RateSheet)
    private readonly rateSheetRepository: Repository<RateSheet>,
  ) {}

  async findAll(
    tenantId: string,
    query?: { shipmentId?: string; status?: InvoiceStatus },
  ): Promise<Invoice[]> {
    const where: FindOptionsWhere<Invoice> = { tenant_id: tenantId };
    if (query?.shipmentId) where.shipment_id = query.shipmentId;
    if (query?.status) where.status = query.status;

    return this.invoiceRepository.find({
      where,
      relations: { lineItems: true },
      order: { created_at: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id, tenant_id: tenantId },
      relations: { lineItems: true },
    });
    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }
    return invoice;
  }

  async create(tenantId: string, dto: CreateInvoiceDto): Promise<Invoice> {
    const invoice = this.invoiceRepository.create({
      tenant_id: tenantId,
      shipment_id: dto.shipmentId ?? null,
      bill_to_party_id: dto.billToPartyId,
      invoice_number: await this.generateInvoiceNumber(),
      status: InvoiceStatus.DRAFT,
      currency: dto.currency ?? 'USD',
      issue_date: new Date(dto.issueDate),
      due_date: dto.dueDate ? new Date(dto.dueDate) : null,
      notes: dto.notes ?? null,
    });
    return this.invoiceRepository.save(invoice);
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateInvoiceDto,
  ): Promise<Invoice> {
    const invoice = await this.findOne(tenantId, id);

    if (dto.billToPartyId !== undefined)
      invoice.bill_to_party_id = dto.billToPartyId;
    if (dto.currency !== undefined) invoice.currency = dto.currency;
    if (dto.issueDate !== undefined)
      invoice.issue_date = new Date(dto.issueDate);
    if (dto.dueDate !== undefined)
      invoice.due_date = dto.dueDate ? new Date(dto.dueDate) : null;
    if (dto.notes !== undefined) invoice.notes = dto.notes;
    if (dto.status !== undefined) invoice.status = dto.status;

    return this.invoiceRepository.save(invoice);
  }

  // Computes one InvoiceLineItem per RateSheetItem, matching its rate_basis
  // against the shipment's aggregate cargo figures (summed across all cargo
  // lines), applying each item's min_charge as a floor.
  async generateFromShipment(
    tenantId: string,
    shipmentId: string,
    rateSheetId: string,
    billToPartyId: string,
  ): Promise<Invoice> {
    const rateSheet = await this.rateSheetRepository.findOne({
      where: { id: rateSheetId, tenant_id: tenantId },
      relations: { items: true },
    });
    if (!rateSheet) {
      throw new NotFoundException(`Rate sheet ${rateSheetId} not found`);
    }

    const cargoItems = await this.cargoItemRepository.find({
      where: { tenant_id: tenantId, shipment_id: shipmentId },
    });

    const totalWeightKg = cargoItems.reduce(
      (sum, c) => sum + Number(c.gross_weight_kg),
      0,
    );
    const totalVolumeCbm = cargoItems.reduce(
      (sum, c) => sum + Number(c.volume_cbm ?? 0),
      0,
    );
    const totalPackages = cargoItems.reduce(
      (sum, c) => sum + c.num_packages,
      0,
    );

    const invoice = this.invoiceRepository.create({
      tenant_id: tenantId,
      shipment_id: shipmentId,
      bill_to_party_id: billToPartyId,
      invoice_number: await this.generateInvoiceNumber(),
      status: InvoiceStatus.DRAFT,
      currency: rateSheet.items[0]?.currency ?? 'USD',
      issue_date: new Date(),
    });
    const savedInvoice = await this.invoiceRepository.save(invoice);

    const lineItems = rateSheet.items.map((item) =>
      this.computeLineItem(savedInvoice.id, item, {
        totalWeightKg,
        totalVolumeCbm,
        totalPackages,
      }),
    );
    await this.lineItemRepository.save(lineItems);

    const subtotal = lineItems.reduce((sum, li) => sum + li.amount, 0);
    savedInvoice.subtotal_amount = subtotal;
    savedInvoice.total_amount = subtotal;
    const finalInvoice = await this.invoiceRepository.save(savedInvoice);
    finalInvoice.lineItems = lineItems;
    return finalInvoice;
  }

  private computeLineItem(
    invoiceId: string,
    rateItem: RateSheetItem,
    totals: {
      totalWeightKg: number;
      totalVolumeCbm: number;
      totalPackages: number;
    },
  ): InvoiceLineItem {
    const rate = Number(rateItem.rate_amount);
    let quantity: number;

    switch (rateItem.rate_basis) {
      case RateBasis.PER_KG:
        quantity = totals.totalWeightKg;
        break;
      case RateBasis.PER_CBM:
        quantity = totals.totalVolumeCbm;
        break;
      case RateBasis.PER_PACKAGE:
        quantity = totals.totalPackages;
        break;
      case RateBasis.FLAT:
      case RateBasis.PER_CONTAINER:
      default:
        quantity = 1;
        break;
    }

    let amount = quantity * rate;
    const minCharge = rateItem.min_charge ? Number(rateItem.min_charge) : null;
    if (minCharge !== null && amount < minCharge) {
      amount = minCharge;
    }

    return this.lineItemRepository.create({
      invoice_id: invoiceId,
      description: rateItem.description,
      quantity,
      unit_price: rate,
      amount,
    });
  }

  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    const countThisYear = await this.invoiceRepository.count({
      where: { invoice_number: ILike(`${prefix}%`) },
    });
    const sequence = String(countThisYear + 1).padStart(4, '0');
    return `${prefix}${sequence}`;
  }
}
