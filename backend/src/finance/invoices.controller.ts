import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthUser,
} from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { InvoiceStatus } from '../entities/invoice.entity';
import { UserRole } from '../entities/user.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { GenerateInvoiceDto } from './dto/generate-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoicesService } from './invoices.service';

@ApiTags('invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('shipmentId') shipmentId?: string,
    @Query('status') status?: InvoiceStatus,
  ) {
    return this.invoicesService.findAll(user.tenantId, { shipmentId, status });
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateInvoiceDto) {
    return this.invoicesService.create(user.tenantId, dto);
  }

  @Post('generate/:shipmentId')
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  generate(
    @CurrentUser() user: AuthUser,
    @Param('shipmentId') shipmentId: string,
    @Body() dto: GenerateInvoiceDto,
  ) {
    return this.invoicesService.generateFromShipment(
      user.tenantId,
      shipmentId,
      dto.rateSheetId,
      dto.billToPartyId,
    );
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.invoicesService.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.invoicesService.update(user.tenantId, id, dto);
  }
}
