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

export interface AuditLogQueryParams {
  entityName?: string;
  entityId?: string;
  userId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedAuditLogs {
  data: unknown[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
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
   * Query audit logs with filtering and pagination.
   */
  async findAll(params: AuditLogQueryParams): Promise<PaginatedAuditLogs> {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? Math.min(params.limit, 100) : 20;
    const skip = (page - 1) * limit;

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

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
