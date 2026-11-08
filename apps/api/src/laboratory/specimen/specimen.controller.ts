import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import type { Response } from 'express';
import { Role, SampleCondition } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DataScopeInterceptor } from '../../common/interceptors/data-scope.interceptor';
import { SpecimenService } from './specimen.service';
import { RecordConditionDto, CreateHandoffDto, BatchLabelsDto } from './dto';

@ApiTags('Specimens')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(DataScopeInterceptor)
@Controller('api/v1')
export class SpecimenController {
  constructor(private readonly specimenService: SpecimenService) {}

  // ─── Specimen Listing ────────────────────────────────────────────────────────

  @Get('specimens')
  @Roles(Role.ADMIN, Role.SAMPLING, Role.ANALIS, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all specimens with pagination and filters' })
  async listAllSpecimens(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('condition') condition?: SampleCondition,
  ) {
    return this.specimenService.listSpecimens({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search: search || undefined,
      condition: condition || undefined,
    });
  }

  @Get('specimens/:id')
  @Roles(Role.ADMIN, Role.SAMPLING, Role.ANALIS, Role.DOKTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get specimen detail by ID' })
  async getSpecimenDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.specimenService.getSpecimenById(id);
  }

  // ─── Order-Scoped Specimen Endpoints ─────────────────────────────────────────

  @Post('orders/:orderId/specimens')
  @Roles(Role.ADMIN, Role.SAMPLING, Role.ANALIS, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create specimens for an order' })
  async createSpecimens(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.specimenService.createSpecimensForOrder(orderId, user.id);
  }

  @Get('orders/:orderId/specimens')
  @Roles(Role.ADMIN, Role.SAMPLING, Role.ANALIS, Role.DOKTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'List specimens for an order' })
  async listSpecimens(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.specimenService.getSpecimensByOrder(orderId);
  }

  // ─── Specimen-Scoped Endpoints ───────────────────────────────────────────────

  @Post('specimens/batch-labels')
  @Roles(Role.ADMIN, Role.SAMPLING, Role.ANALIS, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Generate ZPL batch labels for specimens' })
  async generateBatchLabels(@Body() dto: BatchLabelsDto, @Res() res: Response) {
    const zplBuffer = await this.specimenService.generateBatchLabels(
      dto.specimenIds,
    );

    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': 'attachment; filename="labels.zpl"',
      'Content-Length': zplBuffer.length.toString(),
    });

    res.send(zplBuffer);
  }

  @Patch('specimens/:id/condition')
  @Roles(Role.ADMIN, Role.SAMPLING, Role.ANALIS, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Record specimen condition' })
  async recordCondition(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordConditionDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.specimenService.recordCondition(id, dto, user.id);
  }

  @Post('specimens/:id/regenerate-barcode')
  @Roles(Role.ADMIN, Role.SAMPLING)
  @ApiOperation({
    summary: 'Regenerate specimen barcode (ADMIN, SAMPLING only)',
  })
  async regenerateBarcode(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.specimenService.regenerateBarcode(id, user.id);
  }

  @Post('specimens/:id/handoff')
  @Roles(Role.ADMIN, Role.SAMPLING, Role.ANALIS, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Record custody handoff for a specimen' })
  async recordHandoff(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateHandoffDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    // Override the specimenId from the URL path
    dto.specimenId = id;
    return this.specimenService.recordHandoff(dto, user.id);
  }

  @Get('specimens/:id/history')
  @Roles(Role.ADMIN, Role.SAMPLING, Role.ANALIS, Role.DOKTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get collection attempt history for a specimen' })
  async getCollectionHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.specimenService.getCollectionHistory(id);
  }
}
