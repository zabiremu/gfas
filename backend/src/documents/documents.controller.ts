import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import {
  CurrentUser,
  type AuthUser,
} from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { DocumentStatus } from '../entities/document.entity';
import { UserRole } from '../entities/user.entity';
import { DocumentsService } from './documents.service';
import { GenerateDocumentDto } from './dto/generate-document.dto';

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('shipmentId') shipmentId?: string,
    @Query('status') status?: DocumentStatus,
    @Query('docType') docType?: string,
  ) {
    return this.documentsService.findAll(user.tenantId, {
      shipmentId,
      status,
      docType,
    });
  }

  @Post('generate/:shipmentId')
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  generate(
    @CurrentUser() user: AuthUser,
    @Param('shipmentId') shipmentId: string,
    @Body() dto: GenerateDocumentDto,
  ) {
    return this.documentsService.generatePdf(user.tenantId, shipmentId, dto);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.documentsService.findOne(user.tenantId, id);
  }

  @Patch(':id/void')
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  voidDocument(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.documentsService.voidDocument(user.tenantId, id);
  }

  @Get(':id/download')
  async download(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { buffer, filename } = await this.documentsService.downloadFile(
      user.tenantId,
      id,
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    return new StreamableFile(buffer);
  }
}
