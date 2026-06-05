import {
  Body,
  Controller,
  Get,
  Param,
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
import { PartyRole } from '../entities/party.entity';
import { CreatePartyDto } from './dto/create-party.dto';
import { UpdatePartyDto } from './dto/update-party.dto';
import { PartiesService } from './parties.service';

@ApiTags('parties')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('parties')
export class PartiesController {
  constructor(private readonly partiesService: PartiesService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('role') role?: PartyRole,
    @Query('q') q?: string,
  ) {
    return this.partiesService.findAll(user.tenantId, { role, q });
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePartyDto) {
    return this.partiesService.create(user.tenantId, dto);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.partiesService.findOne(user.tenantId, id);
  }

  @Put(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePartyDto,
  ) {
    return this.partiesService.update(user.tenantId, id, dto);
  }
}
