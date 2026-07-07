import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DashboardService } from './dashboard.service';

@Controller('api/v1/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

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
}
