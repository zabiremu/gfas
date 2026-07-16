import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { ShipmentDirection, ShipmentMode } from '../../entities/shipment.entity';
import { CargoItemInputDto } from './cargo-item-input.dto';

export class CreateShipmentDto {
  @IsEnum(ShipmentMode)
  mode: ShipmentMode;

  @IsEnum(ShipmentDirection)
  direction: ShipmentDirection;

  @IsString()
  @IsNotEmpty()
  originPort: string;

  @IsString()
  @IsNotEmpty()
  destinationPort: string;

  @IsOptional()
  @IsDateString()
  etd?: string;

  @IsOptional()
  @IsDateString()
  eta?: string;

  @IsOptional()
  @IsString()
  vesselName?: string;

  @IsOptional()
  @IsString()
  flightNumber?: string;

  @IsOptional()
  @IsString()
  mawbNumber?: string;

  // Preferred: one or more cargo lines. Takes precedence over the flat
  // fields below when provided.
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CargoItemInputDto)
  cargoItems?: CargoItemInputDto[];

  // Deprecated fallback: a single cargo line specified flat on the shipment
  // payload, for clients not yet updated to send `cargoItems`. Ignored if
  // `cargoItems` is provided.
  @IsOptional()
  @IsString()
  goodsDescription?: string;

  @IsOptional()
  @IsString()
  hsCode?: string;

  @IsOptional()
  @IsString()
  countryOfOrigin?: string;

  @IsOptional()
  @IsNumber()
  grossWeightKg?: number;

  @IsOptional()
  @IsNumber()
  volumeCbm?: number;

  @IsOptional()
  @IsNumber()
  numPackages?: number;

  @IsOptional()
  @IsString()
  packageType?: string;

  @IsOptional()
  @IsNumber()
  declaredValueUsd?: number;

  @IsOptional()
  @IsBoolean()
  isHazmat?: boolean;

  @IsOptional()
  @IsString()
  hazmatUnNumber?: string;

  @IsOptional()
  @IsString()
  hazmatProperShippingName?: string;

  @IsOptional()
  @IsString()
  hazmatClass?: string;

  @IsOptional()
  @IsString()
  hazmatPackingGroup?: string;

  @IsOptional()
  @IsUUID()
  shipperId?: string;

  @IsOptional()
  @IsUUID()
  consigneeId?: string;

  @IsOptional()
  @IsUUID()
  notifyPartyId?: string;
}
