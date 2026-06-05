import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateTrackingEventDto {
  @IsString()
  @IsNotEmpty()
  eventCode: string;

  @IsString()
  @IsNotEmpty()
  eventDescription: string;

  @IsOptional()
  @IsString()
  locationName?: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  @IsDateString()
  eventTime: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
