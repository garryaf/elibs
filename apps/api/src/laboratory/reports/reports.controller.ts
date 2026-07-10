import { Controller, Get, Query, Res, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ReportsService } from './reports.service';
import { PdfReportService } from './pdf-report.service';
import { ReportQueryDto } from './dto/report-query.dto';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('api/v1/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER, Role.ADMIN)
@UseInterceptors(CacheInterceptor)
@CacheTTL(60000) // 60 seconds default cache for reports
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly pdfReportService: PdfReportService,
  ) {}

  @Get('revenue-summary')
  @ApiOperation({ summary: 'Get revenue summary report' })
  async getRevenueSummary(@Query() query: ReportQueryDto) {
    const data = await this.reportsService.getRevenueSummary(query);
    return { success: true, message: 'Revenue summary retrieved', data };
  }

  @Get('orders-by-status')
  @ApiOperation({ summary: 'Get orders grouped by status' })
  async getOrdersByStatus(@Query() query: ReportQueryDto) {
    const data = await this.reportsService.getOrdersByStatus(query);
    return { success: true, message: 'Orders by status retrieved', data };
  }

  @Get('orders-by-payment-method')
  @ApiOperation({ summary: 'Get orders grouped by payment method' })
  async getOrdersByPaymentMethod(@Query() query: ReportQueryDto) {
    const data = await this.reportsService.getOrdersByPaymentMethod(query);
    return { success: true, message: 'Orders by payment method retrieved', data };
  }

  @Get('top-tests')
  @ApiOperation({ summary: 'Get most ordered tests ranking' })
  async getTopTests(@Query() query: ReportQueryDto) {
    const data = await this.reportsService.getTopTests(query);
    return { success: true, message: 'Top tests retrieved', data };
  }

  @Get('insurance-claims')
  @ApiOperation({ summary: 'Get insurance claims summary' })
  async getInsuranceClaims(@Query() query: ReportQueryDto) {
    const data = await this.reportsService.getInsuranceClaims(query);
    return { success: true, message: 'Insurance claims summary retrieved', data };
  }

  @Get('turnaround-time')
  @ApiOperation({ summary: 'Get lab turnaround time report' })
  async getTurnaroundTime(@Query() query: ReportQueryDto) {
    const data = await this.reportsService.getTurnaroundTime(query);
    return { success: true, message: 'Turnaround time report retrieved', data };
  }

  @Get('revenue-summary/pdf')
  @ApiOperation({ summary: 'Download revenue summary as PDF' })
  async getRevenueSummaryPdf(
    @Query() query: ReportQueryDto,
    @Res() res: Response,
  ) {
    const data = await this.reportsService.getRevenueSummary(query);
    const pdfBuffer = await this.pdfReportService.generateRevenuePdf(data);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="revenue-report-${new Date().toISOString().slice(0, 10)}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  }

  @Get('orders-by-status/pdf')
  @ApiOperation({ summary: 'Download orders by status report as PDF' })
  async getOrdersByStatusPdf(
    @Query() query: ReportQueryDto,
    @Res() res: Response,
  ) {
    const data = await this.reportsService.getOrdersByStatus(query);
    const pdfBuffer =
      await this.pdfReportService.generateOrderSummaryPdf(data);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="orders-status-report-${new Date().toISOString().slice(0, 10)}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  }
}
