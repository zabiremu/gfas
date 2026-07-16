import { PartialType } from '@nestjs/swagger';
import { RateSheetItemInputDto } from './rate-sheet-item-input.dto';

export class UpdateRateSheetItemDto extends PartialType(
  RateSheetItemInputDto,
) {}
