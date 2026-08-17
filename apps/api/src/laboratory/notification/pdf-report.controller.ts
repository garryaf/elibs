import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PdfReportCacheService } from './pdf-report-cache.service';

/**
 * Controller for lab report PDF generation and download.
 * Provides GET /api/v1/orders/:id/report/pdf endpoint.
 *
 * Generates PDFs on-demand or serves from cache.
 * Requirements: 11.2, 11.3
 */
@ApiTags('Lab Report PDF')
@ApiBearerAuth()
@Controller('api/v1/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  Role.SUPER_ADMIN,
  Role.OWNER,
  Role.ADMIN,
  Role.MANAGER,
  Role.DOKTER,
  Role.ANALIS,
  Role.KASIR,
)
export class PdfReportController {
  constructor(
    private readonly pdfReportCacheService: PdfReportCacheService,
  ) {}

  @Get(':id/report/pdf')
  @ApiOperation({
    summary: 'Download lab report as PDF',
    description:
      'Generates a lab report PDF on-demand or serves from cache. ' +
      'The PDF includes patient info, test results with reference ranges, ' +
      'flag indicators, addendums, and report version in the footer.',
  })
  @ApiParam({
    name: 'id',
    description: 'Order UUID',
    type: 'string',
    format: 'uuid',
  })
  async downloadReportPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { buffer, orderNumber, version } =
      await this.pdfReportCacheService.getOrGeneratePdf(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="lab-report-${orderNumber}-v${version}.pdf"`,
      'Content-Length': buffer.length.toString(),
      'Cache-Control': 'private, max-age=300',
    });

    res.send(buffer);
  }
}
