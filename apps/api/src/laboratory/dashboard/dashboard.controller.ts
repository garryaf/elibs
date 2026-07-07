import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DashboardService } from './dashboard.service';
import { RegionDistributionQueryDto } from './dto/region-distribution-query.dto';

@Controller('api/v1/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('executive-summary')
  @Roles(Role.OWNER, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN, Role.KASIR, Role.CS)
  async getExecutiveSummary() {
    return this.dashboardService.getExecutiveSummary();
  }

  @Get('recent-orders')
  @Roles(Role.OWNER, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN, Role.KASIR, Role.CS)
  async getRecentOrders() {
    return this.dashboardService.getRecentOrders();
  }

  @Get('lab-summary')
  @Roles(Role.OWNER, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  async getLabSummary() {
    return this.dashboardService.getLabSummary();
  }

  @Get('lab-volume')
  @Roles(Role.OWNER, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  async getLabVolume(@Query('days') days?: string) {
    const numDays = days ? parseInt(days, 10) : 30;
    return this.dashboardService.getLabVolume(numDays);
  }

  @Get('region-distribution')
  @Roles(Role.OWNER, Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  async getRegionDistribution(@Query() query: RegionDistributionQueryDto) {
    const data = await this.dashboardService.getRegionDistribution(query);
    return {
      success: true,
      message: 'Region distribution retrieved successfully',
      data,
    };
  }
}
