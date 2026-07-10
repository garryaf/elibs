import { Controller, Get, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ReportsService } from './reports.service';
import { ReportQueryDto } from './dto/report-query.dto';

@Controller('api/v1/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER, Role.ADMIN)
@UseInterceptors(CacheInterceptor)
@CacheTTL(60000) // 60 seconds default cache for reports
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('revenue-summary')
  async getRevenueSummary(@Query() query: ReportQueryDto) {
    const data = await this.reportsService.getRevenueSummary(query);
    return { success: true, message: 'Revenue summary retrieved', data };
  }

  @Get('orders-by-status')
  async getOrdersByStatus(@Query() query: ReportQueryDto) {
    const data = await this.reportsService.getOrdersByStatus(query);
    return { success: true, message: 'Orders by status retrieved', data };
  }

  @Get('orders-by-payment-method')
  async getOrdersByPaymentMethod(@Query() query: ReportQueryDto) {
    const data = await this.reportsService.getOrdersByPaymentMethod(query);
    return { success: true, message: 'Orders by payment method retrieved', data };
  }

  @Get('top-tests')
  async getTopTests(@Query() query: ReportQueryDto) {
    const data = await this.reportsService.getTopTests(query);
    return { success: true, message: 'Top tests retrieved', data };
  }

  @Get('insurance-claims')
  async getInsuranceClaims(@Query() query: ReportQueryDto) {
    const data = await this.reportsService.getInsuranceClaims(query);
    return { success: true, message: 'Insurance claims summary retrieved', data };
  }

  @Get('turnaround-time')
  async getTurnaroundTime(@Query() query: ReportQueryDto) {
    const data = await this.reportsService.getTurnaroundTime(query);
    return { success: true, message: 'Turnaround time report retrieved', data };
  }
}
