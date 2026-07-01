import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateWarehouseEntryDto {
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @IsString()
  @IsNotEmpty()
  batchNumber: string;

  @IsOptional()
  @IsString()
  lotNumber?: string;

  @IsInt()
  numPallets: number;

  @IsNumber()
  weightKg: number;

  @IsOptional()
  @IsBoolean()
  isHazmat?: boolean;

  @IsOptional()
  @IsString()
  hazmatClass?: string;

  @IsOptional()
  @IsString()
  hazmatUnNumber?: string;

  @IsOptional()
  @IsString()
  zone?: string;

  @IsOptional()
  @IsString()
  aisle?: string;

  @IsOptional()
  @IsString()
  rack?: string;

  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsNumber()
  tempMin?: number;

  @IsOptional()
  @IsNumber()
  tempMax?: number;

  @IsDateString()
  storageStartDate: string;

  @IsOptional()
  @IsDateString()
  storageEndDate?: string;

  @IsOptional()
  @IsUUID()
  shipmentId?: string;
}
