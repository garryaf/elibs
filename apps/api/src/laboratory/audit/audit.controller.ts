import { Controller, Get, Param, Query, Res, Header, UseGuards, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { AuditService, AuditLogQueryParams } from './audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('api/v1/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.OWNER)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * List audit logs with filtering, pagination, and server-side sorting.
   * AT-FN-01: sortField & sortDir params
   * AT-FN-02+03: Response includes userName, userEmail, SYSTEM label
   */
  @Get()
  async findAll(
    @Query('entityName') entityName?: string,
    @Query('entityId') entityId?: string,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortField') sortField?: string,
    @Query('sortDir') sortDir?: string,
  ) {
    const params: AuditLogQueryParams = {
      entityName,
      entityId,
      userId,
      action,
      startDate,
      endDate,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      sortField,
      sortDir,
    };

    return this.auditService.findAll(params);
  }

  /**
   * Get audit statistics for today's activity.
   */
  @Get('stats')
  async getStats() {
    return this.auditService.getStats();
  }

  /**
   * AT-FN-06: Get all distinct action types in audit logs.
   * Used by frontend to dynamically populate the action filter dropdown.
   */
  @Get('actions')
  async getDistinctActions() {
    return this.auditService.getDistinctActions();
  }

  /**
   * AT-FN-04: Export audit logs as CSV file with current filters applied.
   * Includes user name resolution in export.
   */
  @Get('export')
  @Header('Content-Type', 'text/csv')
  async exportCsv(
    @Query('entityName') entityName?: string,
    @Query('entityId') entityId?: string,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('sortField') sortField?: string,
    @Query('sortDir') sortDir?: string,
    @Res() res?: Response,
  ) {
    const params: AuditLogQueryParams = {
      entityName,
      entityId,
      userId,
      action,
      startDate,
      endDate,
      sortField,
      sortDir,
    };

    const csv = await this.auditService.exportCsv(params);
    const filename = `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;

    res!.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res!.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res!.send(csv);
  }

  /**
   * AT-FN-05: Get a single audit log entry by ID.
   * Supports deep-linking to specific audit events.
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const log = await this.auditService.findOne(id);
    if (!log) {
      throw new NotFoundException(`Audit log with ID "${id}" not found`);
    }
    return log;
  }
}
