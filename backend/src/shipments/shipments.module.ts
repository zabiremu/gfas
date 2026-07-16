import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CargoItem } from '../entities/cargo-item.entity';
import { ShipmentDocument } from '../entities/document.entity';
import { Shipment } from '../entities/shipment.entity';
import { ShipmentParty } from '../entities/shipment-party.entity';
import { TrackingEvent } from '../entities/tracking-event.entity';
import { ShipmentsController } from './shipments.controller';
import { ShipmentsService } from './shipments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Shipment,
      TrackingEvent,
      ShipmentDocument,
      ShipmentParty,
      CargoItem,
    ]),
  ],
  controllers: [ShipmentsController],
  providers: [ShipmentsService],
  exports: [ShipmentsService],
})
export class ShipmentsModule {}
