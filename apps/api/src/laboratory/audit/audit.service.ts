import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * Sensitive fields that must be excluded from audit log values.
 */
export const SENSITIVE_FIELDS = [
  'passwordHash',
  'password',
  'token',
  'secret',
  'accessToken',
  'refreshToken',
];

/**
 * Strips sensitive fields from an object before storing in audit logs.
 */
export function stripSensitiveFields(
  data: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!data) return null;
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!SENSITIVE_FIELDS.includes(key)) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

// ─── Allowed sort fields to prevent SQL injection ─────────────────────────────
const ALLOWED_SORT_FIELDS = ['timestamp', 'action', 'entityName', 'entityId', 'userId'] as const;
type AuditSortField = typeof ALLOWED_SORT_FIELDS[number];

export interface AuditLogQueryParams {
  entityName?: string;
  entityId?: string;
  userId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortField?: string;
  sortDir?: string;
}

export interface AuditLogWithUser {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  action: string;
  entityName: string;
  entityId: string;
  oldValues: unknown;
  newValues: unknown;
  ipAddress: string | null;
  timestamp: Date;
}

export interface PaginatedAuditLogs {
  data: AuditLogWithUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditStats {
  totalToday: number;
  createCount: number;
  updateCount: number;
  deleteCount: number;
  totalAll: number;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Explicitly log an audit event with full user context.
   * This is the preferred method for services to call after mutations.
   */
  async log(
    userId: string,
    action: string,
    entityName: string,
    entityId: string,
    oldValues: Record<string, unknown> | null,
    newValues: Record<string, unknown> | null,
    ipAddress?: string | null,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action,
        entityName,
        entityId,
        oldValues: stripSensitiveFields(oldValues) as Prisma.InputJsonValue ?? Prisma.JsonNull,
        newValues: stripSensitiveFields(newValues) as Prisma.InputJsonValue ?? Prisma.JsonNull,
        ipAddress: ipAddress ?? null,
      },
    });
  }

  /**
   * Validate and sanitize sort field to prevent injection.
   */
  private getSortField(field?: string): AuditSortField {
    if (field && ALLOWED_SORT_FIELDS.includes(field as AuditSortField)) {
      return field as AuditSortField;
    }
    return 'timestamp';
  }

  /**
   * Validate sort direction.
   */
  private getSortDir(dir?: string): 'asc' | 'desc' {
    return dir === 'asc' ? 'asc' : 'desc';
  }

  /**
   * Map Prisma field names to database column names for orderBy.
   */
  private mapFieldToColumn(field: AuditSortField): string {
    const mapping: Record<AuditSortField, string> = {
      timestamp: 'timestamp',
      action: 'action',
      entityName: '"entityName"',
      entityId: '"entityId"',
      userId: '"userId"',
    };
    return mapping[field];
  }

  /**
   * Query audit logs with filtering, pagination, server-side sorting,
   * and user name resolution via LEFT JOIN on users table.
   * (AT-FN-01: server-side sorting, AT-FN-02+03: user name + SYSTEM label)
   */
  async findAll(params: AuditLogQueryParams): Promise<PaginatedAuditLogs> {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? Math.min(params.limit, 100) : 20;
    const skip = (page - 1) * limit;
    const sortField = this.getSortField(params.sortField);
    const sortDir = this.getSortDir(params.sortDir);

    // Build WHERE clause
    const where: Prisma.AuditLogWhereInput = {};

    if (params.entityName) {
      where.entityName = params.entityName;
    }
    if (params.entityId) {
      where.entityId = params.entityId;
    }
    if (params.userId) {
      where.userId = params.userId;
    }
    if (params.action) {
      where.action = params.action;
    }
    if (params.startDate || params.endDate) {
      where.timestamp = {};
      if (params.startDate) {
        where.timestamp.gte = new Date(params.startDate);
      }
      if (params.endDate) {
        where.timestamp.lte = new Date(params.endDate);
      }
    }

    // Get total count
    const total = await this.prisma.auditLog.count({ where });

    // Build the orderBy for Prisma (AT-FN-01)
    const orderBy: Record<string, 'asc' | 'desc'> = {};
    orderBy[sortField] = sortDir;

    // Fetch audit logs
    const rawLogs = await this.prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    });

    // AT-FN-02+03: Resolve userIds to user names
    const userIds = [...new Set(rawLogs.map((l) => l.userId))];
    const users = userIds.length > 0
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        })
      : [];

    const userMap = new Map(users.map((u) => [u.id, u]));
    const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

    const data: AuditLogWithUser[] = rawLogs.map((log) => {
      const user = userMap.get(log.userId);
      let userName: string | null = null;
      let userEmail: string | null = null;

      if (log.userId === SYSTEM_USER_ID) {
        userName = 'SYSTEM';
        userEmail = null;
      } else if (user) {
        userName = user.name;
        userEmail = user.email;
      }

      return {
        id: log.id,
        userId: log.userId,
        userName,
        userEmail,
        action: log.action,
        entityName: log.entityName,
        entityId: log.entityId,
        oldValues: log.oldValues,
        newValues: log.newValues,
        ipAddress: log.ipAddress,
        timestamp: log.timestamp,
      };
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * AT-FN-05: Get a single audit log by ID with user resolution.
   */
  async findOne(id: string): Promise<AuditLogWithUser | null> {
    const log = await this.prisma.auditLog.findUnique({ where: { id } });
    if (!log) return null;

    const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';
    let userName: string | null = null;
    let userEmail: string | null = null;

    if (log.userId === SYSTEM_USER_ID) {
      userName = 'SYSTEM';
    } else {
      const user = await this.prisma.user.findUnique({
        where: { id: log.userId },
        select: { name: true, email: true },
      });
      if (user) {
        userName = user.name;
        userEmail = user.email;
      }
    }

    return {
      id: log.id,
      userId: log.userId,
      userName,
      userEmail,
      action: log.action,
      entityName: log.entityName,
      entityId: log.entityId,
      oldValues: log.oldValues,
      newValues: log.newValues,
      ipAddress: log.ipAddress,
      timestamp: log.timestamp,
    };
  }

  /**
   * Get audit stats for today (counts by action type).
   */
  async getStats(): Promise<AuditStats> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalAll, totalToday, createCount, updateCount, deleteCount] = await Promise.all([
      this.prisma.auditLog.count(),
      this.prisma.auditLog.count({ where: { timestamp: { gte: todayStart } } }),
      this.prisma.auditLog.count({ where: { timestamp: { gte: todayStart }, action: 'CREATE' } }),
      this.prisma.auditLog.count({ where: { timestamp: { gte: todayStart }, action: 'UPDATE' } }),
      this.prisma.auditLog.count({ where: { timestamp: { gte: todayStart }, action: 'DELETE' } }),
    ]);

    return { totalToday, createCount, updateCount, deleteCount, totalAll };
  }

  /**
   * Get all distinct action types currently in the audit log.
   * Used by frontend to populate the action filter dynamically.
   */
  async getDistinctActions(): Promise<string[]> {
    const results = await this.prisma.auditLog.findMany({
      distinct: ['action'],
      select: { action: true },
      orderBy: { action: 'asc' },
    });
    return results.map((r) => r.action);
  }

  /**
   * Export audit logs as CSV string with applied filters and user name resolution.
   * Limited to 10,000 rows to prevent memory issues.
   */
  async exportCsv(params: AuditLogQueryParams): Promise<string> {
    const where: Prisma.AuditLogWhereInput = {};

    if (params.entityName) where.entityName = params.entityName;
    if (params.entityId) where.entityId = params.entityId;
    if (params.userId) where.userId = params.userId;
    if (params.action) where.action = params.action;

    if (params.startDate || params.endDate) {
      where.timestamp = {};
      if (params.startDate) where.timestamp.gte = new Date(params.startDate);
      if (params.endDate) where.timestamp.lte = new Date(params.endDate);
    }

    const sortField = this.getSortField(params.sortField);
    const sortDir = this.getSortDir(params.sortDir);
    const orderBy: Record<string, 'asc' | 'desc'> = {};
    orderBy[sortField] = sortDir;

    const logs = await this.prisma.auditLog.findMany({
      where,
      take: 10000,
      orderBy,
    });

    // Resolve user names for export
    const userIds = [...new Set(logs.map((l) => l.userId))];
    const users = userIds.length > 0
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));
    const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

    const header = 'ID,Timestamp,User ID,User Name,User Email,Action,Entity,Entity ID,IP Address,Old Values,New Values';
    const rows = logs.map((log) => {
      const user = userMap.get(log.userId);
      const userName = log.userId === SYSTEM_USER_ID ? 'SYSTEM' : (user?.name || '');
      const userEmail = log.userId === SYSTEM_USER_ID ? '' : (user?.email || '');
      const oldVals = log.oldValues ? JSON.stringify(log.oldValues).replace(/"/g, '""') : '';
      const newVals = log.newValues ? JSON.stringify(log.newValues).replace(/"/g, '""') : '';
      return `${log.id},${log.timestamp.toISOString()},${log.userId},"${userName}","${userEmail}",${log.action},${log.entityName},${log.entityId},${log.ipAddress || ''},"${oldVals}","${newVals}"`;
    });

    return [header, ...rows].join('\n');
  }
}
