import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Req,
  Res,
  UseGuards,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { Response, Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PdfReportCacheService } from './pdf-report-cache.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

/**
 * Controller for lab report PDF generation and download.
 * Provides GET /api/v1/orders/:id/report/pdf endpoint.
 *
 * Generates PDFs on-demand or serves from cache.
 * Requirements: 11.2, 11.3
 * BP-1: Guards report download — order must be APPROVED before PDF is accessible.
 * BP-2: Logs all report downloads to audit trail.
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
  private readonly logger = new Logger(PdfReportController.name);

  constructor(
    private readonly pdfReportCacheService: PdfReportCacheService,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  @Get(':id/report/pdf')
  @ApiOperation({
    summary: 'Download lab report as PDF',
    description:
      'Generates a lab report PDF on-demand or serves from cache. ' +
      'The PDF includes patient info, test results with reference ranges, ' +
      'flag indicators, addendums, and report version in the footer. ' +
      'BP-1: Only accessible for APPROVED or NOTIFIED orders.',
  })
  @ApiParam({
    name: 'id',
    description: 'Order UUID',
    type: 'string',
    format: 'uuid',
  })
  async downloadReportPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; sub?: string },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // BP-1: Guard — only allow downloading reports for APPROVED/NOTIFIED orders
    const order = await this.prisma.order.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!order) {
      throw new BadRequestException('Order tidak ditemukan');
    }

    if (order.status !== 'APPROVED' && order.status !== 'NOTIFIED') {
      throw new BadRequestException(
        'Laporan belum bisa diunduh. Order harus sudah divalidasi (status APPROVED) oleh dokter terlebih dahulu.',
      );
    }

    const { buffer, orderNumber, version } =
      await this.pdfReportCacheService.getOrGeneratePdf(id);

    // BP-2: Audit log — track who downloaded the report
    const userId = user?.sub || user?.id || 'unknown';
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;
    await this.auditService.log(
      userId,
      'REPORT_DOWNLOADED',
      'Order',
      id,
      null,
      { format: 'pdf', version, orderNumber },
      ipAddress,
    ).catch((err) => {
      // Non-blocking: don't fail the download if audit logging fails
      this.logger.warn(`Failed to log report download audit: ${err.message}`);
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="lab-report-${orderNumber}-v${version}.pdf"`,
      'Content-Length': buffer.length.toString(),
      'Cache-Control': 'private, max-age=300',
    });

    res.send(buffer);
  }
}
