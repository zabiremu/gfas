import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ShipmentMode } from '../../entities/shipment.entity';

export class CreateShipmentDto {
  @IsEnum(ShipmentMode)
  mode: ShipmentMode;

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

  @IsString()
  @IsNotEmpty()
  goodsDescription: string;

  @IsOptional()
  @IsString()
  hsCode?: string;

  @IsOptional()
  @IsString()
  countryOfOrigin?: string;

  @IsNumber()
  grossWeightKg: number;

  @IsOptional()
  @IsNumber()
  volumeCbm?: number;

  @IsInt()
  numPackages: number;

  @IsString()
  @IsNotEmpty()
  packageType: string;

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
