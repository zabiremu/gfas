import { IsUUID } from 'class-validator';

export class GenerateInvoiceDto {
  @IsUUID()
  rateSheetId: string;

  @IsUUID()
  billToPartyId: string;
}
