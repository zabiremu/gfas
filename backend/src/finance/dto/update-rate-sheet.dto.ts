import { PartialType } from '@nestjs/swagger';
import { CreateRateSheetDto } from './create-rate-sheet.dto';

export class UpdateRateSheetDto extends PartialType(CreateRateSheetDto) {}
