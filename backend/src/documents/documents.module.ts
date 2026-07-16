import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CargoItem } from '../entities/cargo-item.entity';
import { DocumentTemplate } from '../entities/document-template.entity';
import { ShipmentDocument } from '../entities/document.entity';
import { Shipment } from '../entities/shipment.entity';
import { ShipmentParty } from '../entities/shipment-party.entity';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { PdfGeneratorService } from './pdf-generator.service';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ShipmentDocument,
      Shipment,
      ShipmentParty,
      CargoItem,
      DocumentTemplate,
    ]),
    StorageModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, PdfGeneratorService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
