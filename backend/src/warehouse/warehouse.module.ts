import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Warehouse } from '../entities/warehouse-facility.entity';
import { WarehouseEntry } from '../entities/warehouse.entity';
import { WarehouseFacilityController } from './warehouse-facility.controller';
import { WarehouseFacilityService } from './warehouse-facility.service';
import { WarehouseController } from './warehouse.controller';
import { WarehouseService } from './warehouse.service';

@Module({
  imports: [TypeOrmModule.forFeature([WarehouseEntry, Warehouse])],
  controllers: [WarehouseController, WarehouseFacilityController],
  providers: [WarehouseService, WarehouseFacilityService],
  exports: [WarehouseService, WarehouseFacilityService],
})
export class WarehouseModule {}
