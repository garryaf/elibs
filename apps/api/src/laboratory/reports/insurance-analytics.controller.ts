import { Controller, Get, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { InsuranceAnalyticsService } from './insurance-analytics.service';
import { InsuranceReportQueryDto } from './dto/insurance-report-query.dto';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('api/v1/reports/insurance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER, Role.ADMIN)
@UseInterceptors(CacheInterceptor)
@CacheTTL(60000)
export class InsuranceAnalyticsController {
  constructor(
    private readonly insuranceAnalyticsService: InsuranceAnalyticsService,
  ) {}

  @Get('breakdown')
  @ApiOperation({ summary: 'Get insurer breakdown analytics' })
  async getInsurerBreakdown(@Query() query: InsuranceReportQueryDto) {
    const data = await this.insuranceAnalyticsService.getInsurerBreakdown(query);
    return { success: true, message: 'Insurer breakdown retrieved', data };
  }

  @Get('rejections')
  @ApiOperation({ summary: 'Get claim rejection analysis' })
  async getRejectionAnalysis(@Query() query: InsuranceReportQueryDto) {
    const data =
      await this.insuranceAnalyticsService.getRejectionAnalysis(query);
    return { success: true, message: 'Rejection analysis retrieved', data };
  }

  @Get('aging')
  @ApiOperation({ summary: 'Get claim aging report' })
  async getClaimAging(@Query() query: InsuranceReportQueryDto) {
    const data = await this.insuranceAnalyticsService.getClaimAging(query);
    return { success: true, message: 'Claim aging report retrieved', data };
  }
}
