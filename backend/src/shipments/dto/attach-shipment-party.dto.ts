import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PartyRole } from '../../entities/party.entity';

export class AttachShipmentPartyDto {
  @IsUUID()
  partyId: string;

  @IsEnum(PartyRole)
  role: PartyRole;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
