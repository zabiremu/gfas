import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CargoItem } from '../entities/cargo-item.entity';
import { Invoice } from '../entities/invoice.entity';
import { InvoiceLineItem } from '../entities/invoice-line-item.entity';
import { RateSheet } from '../entities/rate-sheet.entity';
import { RateSheetItem } from '../entities/rate-sheet-item.entity';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { RateSheetsController } from './rate-sheets.controller';
import { RateSheetsService } from './rate-sheets.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Invoice,
      InvoiceLineItem,
      RateSheet,
      RateSheetItem,
      CargoItem,
    ]),
  ],
  controllers: [InvoicesController, RateSheetsController],
  providers: [InvoicesService, RateSheetsService],
  exports: [InvoicesService, RateSheetsService],
})
export class FinanceModule {}
