import { IsNotEmpty, IsString } from 'class-validator';

export class GenerateDocumentDto {
  // e.g. 'HOUSE_BILL_OF_LADING', 'COMMERCIAL_INVOICE', 'PACKING_LIST'
  @IsString()
  @IsNotEmpty()
  docType: string;
}
