import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { RateBasis } from '../../entities/rate-sheet-item.entity';

export class RateSheetItemInputDto {
  @IsString()
  @IsNotEmpty()
  chargeCode: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(RateBasis)
  rateBasis: RateBasis;

  @IsNumber()
  rateAmount: number;

  @IsOptional()
  @IsNumber()
  minCharge?: number;

  @IsOptional()
  @IsString()
  currency?: string;
}
