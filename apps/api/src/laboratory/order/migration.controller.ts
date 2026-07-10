import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MigrationService } from './migration.service';

@Controller('api/v1/admin/migrations/legacy-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class MigrationController {
  constructor(private readonly migrationService: MigrationService) {}

  @Get('report')
  async getReport() {
    const report = await this.migrationService.getMigrationReport();
    return {
      success: true,
      message: 'Migration report generated',
      data: report,
    };
  }

  @Post()
  async runMigration(@CurrentUser() user: any) {
    const report = await this.migrationService.runLegacyMigration(user.sub);
    return {
      success: true,
      message:
        report.status === 'NOT_NEEDED'
          ? 'No legacy orders need migration'
          : report.status === 'SUCCESS'
            ? 'Legacy order migration completed successfully'
            : 'Legacy order migration failed',
      data: report,
    };
  }
}
