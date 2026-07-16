import {
  Body,
  Controller,
  Delete,
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { CreateRateSheetDto } from './dto/create-rate-sheet.dto';
import { RateSheetItemInputDto } from './dto/rate-sheet-item-input.dto';
import { UpdateRateSheetItemDto } from './dto/update-rate-sheet-item.dto';
import { UpdateRateSheetDto } from './dto/update-rate-sheet.dto';
import { RateSheetsService } from './rate-sheets.service';

@ApiTags('rate-sheets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('rate-sheets')
export class RateSheetsController {
  constructor(private readonly rateSheetsService: RateSheetsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.rateSheetsService.findAll(user.tenantId);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateRateSheetDto) {
    return this.rateSheetsService.create(user.tenantId, dto);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.rateSheetsService.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateRateSheetDto,
  ) {
    return this.rateSheetsService.update(user.tenantId, id, dto);
  }

  @Post(':id/items')
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  addItem(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RateSheetItemInputDto,
  ) {
    return this.rateSheetsService.addItem(user.tenantId, id, dto);
  }

  @Patch(':id/items/:itemId')
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  updateItem(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateRateSheetItemDto,
  ) {
    return this.rateSheetsService.updateItem(user.tenantId, id, itemId, dto);
  }

  @Delete(':id/items/:itemId')
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  removeItem(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.rateSheetsService.removeItem(user.tenantId, id, itemId);
  }
}
