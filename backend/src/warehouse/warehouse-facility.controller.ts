import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthUser,
} from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../entities/user.entity';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { WarehouseFacilityService } from './warehouse-facility.service';

// Facility master (distinct from /warehouse, the storage-entries resource).
@ApiTags('warehouses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('warehouses')
export class WarehouseFacilityController {
  constructor(private readonly facilities: WarehouseFacilityService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.facilities.findAll(user.tenantId);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.WAREHOUSE)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateWarehouseDto) {
    return this.facilities.create(user.tenantId, dto);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.facilities.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.WAREHOUSE)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateWarehouseDto,
  ) {
    return this.facilities.update(user.tenantId, id, dto);
  }
}
