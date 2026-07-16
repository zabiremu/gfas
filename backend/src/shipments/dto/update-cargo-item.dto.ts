import { PartialType } from '@nestjs/swagger';
import { CargoItemInputDto } from './cargo-item-input.dto';

export class UpdateCargoItemDto extends PartialType(CargoItemInputDto) {}
