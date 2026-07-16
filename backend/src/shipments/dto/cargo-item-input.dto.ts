import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CargoItemInputDto {
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
}
