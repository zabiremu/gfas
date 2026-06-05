import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShipmentDocument } from '../entities/document.entity';
import { Shipment } from '../entities/shipment.entity';
import { TrackingEvent } from '../entities/tracking-event.entity';
import { ShipmentsController } from './shipments.controller';
import { ShipmentsService } from './shipments.service';

@Module({
  imports: [TypeOrmModule.forFeature([Shipment, TrackingEvent, ShipmentDocument])],
  controllers: [ShipmentsController],
  providers: [ShipmentsService],
  exports: [ShipmentsService],
})
export class ShipmentsModule {}
