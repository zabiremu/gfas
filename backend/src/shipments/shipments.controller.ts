import {
  Body,
  Controller,
  Delete,
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
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PartyRole } from '../entities/party.entity';
import {
  ShipmentDirection,
  ShipmentMode,
  ShipmentStatus,
} from '../entities/shipment.entity';
import { UserRole } from '../entities/user.entity';
import { AttachShipmentPartyDto } from './dto/attach-shipment-party.dto';
import { CargoItemInputDto } from './dto/cargo-item-input.dto';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { CreateTrackingEventDto } from './dto/create-tracking-event.dto';
import { UpdateCargoItemDto } from './dto/update-cargo-item.dto';
import {
  UpdateShipmentDto,
  UpdateStatusDto,
} from './dto/update-shipment.dto';
import { ShipmentsService } from './shipments.service';

@ApiTags('shipments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('shipments')
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: ShipmentStatus,
    @Query('mode') mode?: ShipmentMode,
    @Query('direction') direction?: ShipmentDirection,
    @Query('q') q?: string,
  ) {
    return this.shipmentsService.findAll(user.tenantId, {
      status,
      mode,
      direction,
      q,
    });
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.AGENT)
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
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateShipmentDto,
  ) {
    return this.shipmentsService.update(user.tenantId, id, dto);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.AGENT)
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
    return this.shipmentsService.getTrackingEvents(user.tenantId, id);
  }

  @Post(':id/tracking')
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.WAREHOUSE)
  async addTracking(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateTrackingEventDto,
  ) {
    // Ensures the shipment belongs to the caller's tenant before adding events.
    await this.shipmentsService.findOne(user.tenantId, id);
    return this.shipmentsService.addTrackingEvent(user.tenantId, id, dto);
  }

  @Get(':id/parties')
  async getParties(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.shipmentsService.findOne(user.tenantId, id);
    return this.shipmentsService.getShipmentParties(user.tenantId, id);
  }

  @Post(':id/parties')
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  async addParty(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AttachShipmentPartyDto,
  ) {
    await this.shipmentsService.findOne(user.tenantId, id);
    return this.shipmentsService.attachShipmentParty(user.tenantId, id, dto);
  }

  @Delete(':id/parties/:partyId')
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  async removeParty(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('partyId') partyId: string,
    @Query('role') role?: PartyRole,
  ) {
    await this.shipmentsService.findOne(user.tenantId, id);
    await this.shipmentsService.detachShipmentParty(
      user.tenantId,
      id,
      partyId,
      role,
    );
  }

  @Get(':id/cargo-items')
  async getCargoItems(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.shipmentsService.findOne(user.tenantId, id);
    return this.shipmentsService.getCargoItems(user.tenantId, id);
  }

  @Post(':id/cargo-items')
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  async addCargoItem(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CargoItemInputDto,
  ) {
    await this.shipmentsService.findOne(user.tenantId, id);
    return this.shipmentsService.addCargoItem(user.tenantId, id, dto);
  }

  @Patch(':id/cargo-items/:cargoItemId')
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  async updateCargoItem(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('cargoItemId') cargoItemId: string,
    @Body() dto: UpdateCargoItemDto,
  ) {
    await this.shipmentsService.findOne(user.tenantId, id);
    return this.shipmentsService.updateCargoItem(
      user.tenantId,
      id,
      cargoItemId,
      dto,
    );
  }

  @Delete(':id/cargo-items/:cargoItemId')
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  async removeCargoItem(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('cargoItemId') cargoItemId: string,
  ) {
    await this.shipmentsService.findOne(user.tenantId, id);
    await this.shipmentsService.removeCargoItem(user.tenantId, id, cargoItemId);
  }
}
