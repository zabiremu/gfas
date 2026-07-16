import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateInvoiceDto {
  @IsOptional()
  @IsUUID()
  shipmentId?: string;

  @IsUUID()
  billToPartyId: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsDateString()
  issueDate: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
