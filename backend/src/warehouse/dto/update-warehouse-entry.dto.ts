import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CreateWarehouseEntryDto } from './create-warehouse-entry.dto';

export class UpdateWarehouseEntryDto extends PartialType(
  CreateWarehouseEntryDto,
) {
  /** Optional free-text note appended to the entry's movement_log. */
  @IsOptional()
  @IsString()
  note?: string;
}
