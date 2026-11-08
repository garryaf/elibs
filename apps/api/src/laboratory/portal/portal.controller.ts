import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { PortalService } from './portal.service';

/**
 * Patient Self-Service Portal Controller.
 *
 * This controller does NOT use JwtAuthGuard — the UUID token
 * in the URL IS the authentication mechanism.
 * Patients receive this token via notification (WhatsApp/email).
 */
@ApiTags('Patient Portal')
@Controller('api/v1/portal')
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  @Get(':token/report')
  @ApiOperation({
    summary: 'Patient self-service report access',
    description:
      'UUID-token authenticated report access. No login required — the token IS the authentication. ' +
      'Use format=pdf query parameter to download the PDF report.',
  })
  @ApiParam({
    name: 'token',
    description: 'UUID portal access token (notification log ID)',
    type: 'string',
    format: 'uuid',
  })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['json', 'pdf'],
    description: 'Response format: json (default) or pdf for download',
  })
  async getReport(
    @Param('token', ParseUUIDPipe) token: string,
    @Query('format') format?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    if (format === 'pdf') {
      const { buffer, orderNumber } =
        await this.portalService.getReportPdfByToken(token);

      res!.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="lab-report-${orderNumber}.pdf"`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'private, max-age=3600',
      });

      return res!.send(buffer);
    }

    // Default: return JSON report data
    const report = await this.portalService.getReportByToken(token);
    return {
      success: true,
      message: 'Laporan berhasil diambil',
      data: report,
    };
  }
}
