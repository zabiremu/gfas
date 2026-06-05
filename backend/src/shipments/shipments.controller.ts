import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthUser,
} from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ShipmentMode, ShipmentStatus } from '../entities/shipment.entity';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { CreateTrackingEventDto } from './dto/create-tracking-event.dto';
import {
  UpdateShipmentDto,
  UpdateStatusDto,
} from './dto/update-shipment.dto';
import { ShipmentsService } from './shipments.service';

@ApiTags('shipments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shipments')
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: ShipmentStatus,
    @Query('mode') mode?: ShipmentMode,
    @Query('q') q?: string,
  ) {
    return this.shipmentsService.findAll(user.tenantId, { status, mode, q });
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateShipmentDto) {
    return this.shipmentsService.create(user.tenantId, user.userId, dto);
  }

  // Must be declared before the ':id' route so it is not captured as an id.
  @Get('dashboard')
  getDashboard(@CurrentUser() user: AuthUser) {
    return this.shipmentsService.getDashboardStats(user.tenantId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.shipmentsService.findOne(user.tenantId, id);
  }

  @Put(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateShipmentDto,
  ) {
    return this.shipmentsService.update(user.tenantId, id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateStatusDto,
  ) {
    return this.shipmentsService.updateStatus(user.tenantId, id, body.status);
  }

  @Get(':id/tracking')
  async getTracking(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    // Ensures the shipment belongs to the caller's tenant before listing events.
    await this.shipmentsService.findOne(user.tenantId, id);
    return this.shipmentsService.getTrackingEvents(id);
  }

  @Post(':id/tracking')
  async addTracking(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateTrackingEventDto,
  ) {
    // Ensures the shipment belongs to the caller's tenant before adding events.
    await this.shipmentsService.findOne(user.tenantId, id);
    return this.shipmentsService.addTrackingEvent(id, dto);
  }
}
