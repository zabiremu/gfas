import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ShipmentStatus } from '../../entities/shipment.entity';
import { CreateShipmentDto } from './create-shipment.dto';

export class UpdateShipmentDto extends PartialType(CreateShipmentDto) {
  @IsOptional()
  @IsEnum(ShipmentStatus)
  status?: ShipmentStatus;
}

export class UpdateStatusDto {
  @IsEnum(ShipmentStatus)
  status: ShipmentStatus;
}
