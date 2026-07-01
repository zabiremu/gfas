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
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../entities/user.entity';
import { WarehouseStatus } from '../entities/warehouse.entity';
import { CreateWarehouseEntryDto } from './dto/create-warehouse-entry.dto';
import { UpdateWarehouseEntryDto } from './dto/update-warehouse-entry.dto';
import { WarehouseService } from './warehouse.service';

@ApiTags('warehouse')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('warehouse')
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: WarehouseStatus,
    @Query('shipmentId') shipmentId?: string,
    @Query('q') q?: string,
  ) {
    return this.warehouseService.findAll(user.tenantId, {
      status,
      shipmentId,
      q,
    });
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.WAREHOUSE)
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateWarehouseEntryDto,
  ) {
    return this.warehouseService.create(user.tenantId, user.email, dto);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.warehouseService.findOne(user.tenantId, id);
  }

  @Patch(':id/release')
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.WAREHOUSE)
  release(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.warehouseService.release(
      user.tenantId,
      id,
      user.userId,
      user.email,
    );
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.WAREHOUSE)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateWarehouseEntryDto,
  ) {
    return this.warehouseService.update(user.tenantId, id, user.email, dto);
  }
}
