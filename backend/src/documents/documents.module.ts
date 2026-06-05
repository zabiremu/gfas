import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShipmentDocument } from '../entities/document.entity';
import { Shipment } from '../entities/shipment.entity';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { PdfGeneratorService } from './pdf-generator.service';

@Module({
  imports: [TypeOrmModule.forFeature([ShipmentDocument, Shipment])],
  controllers: [DocumentsController],
  providers: [DocumentsService, PdfGeneratorService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
