import { Injectable } from '@nestjs/common';
import { ClaimStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface InsuranceReportQuery {
  startDate?: string;
  endDate?: string;
  insurerId?: string;
}

export interface InsurerBreakdown {
  insurerId: string;
  insurerName: string;
  totalClaims: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  totalCoveredAmount: number;
  avgProcessingDays: number;
}

export interface RejectionAnalysis {
  insurerId: string;
  insurerName: string;
  rejectionReason: string;
  count: number;
  totalRejectedAmount: number;
}

export interface ClaimAgingBucket {
  bucket: '0-30' | '31-60' | '61-90' | '>90';
  count: number;
  totalAmount: number;
}

@Injectable()
export class InsuranceAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private getDateFilter(query: InsuranceReportQuery) {
    const filter: { gte?: Date; lte?: Date } = {};
    if (query.startDate) {
      filter.gte = new Date(query.startDate);
    }
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      filter.lte = end;
    }
    return Object.keys(filter).length > 0 ? filter : undefined;
  }

  private buildWhereClause(query: InsuranceReportQuery) {
    const where: Record<string, unknown> = {};
    const dateFilter = this.getDateFilter(query);
    if (dateFilter) {
      where.createdAt = dateFilter;
    }
    if (query.insurerId) {
      where.insuranceId = query.insurerId;
    }
    return where;
  }

  async getInsurerBreakdown(
    query: InsuranceReportQuery,
  ): Promise<InsurerBreakdown[]> {
    const where = this.buildWhereClause(query);

    const claims = await this.prisma.orderInsurance.findMany({
      where,
      select: {
        insuranceId: true,
        claimStatus: true,
        coveredAmount: true,
        createdAt: true,
        approvedAt: true,
        paidAt: true,
        insurance: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Group by insurer
    const insurerMap = new Map<
      string,
      {
        insurerName: string;
        totalClaims: number;
        approvedCount: number;
        rejectedCount: number;
        pendingCount: number;
        totalCoveredAmount: number;
        totalProcessingDays: number;
        processedCount: number;
      }
    >();

    const pendingStatuses: ClaimStatus[] = [
      ClaimStatus.PENDING,
      ClaimStatus.SUBMITTED,
      ClaimStatus.UNDER_REVIEW,
    ];
    const approvedStatuses: ClaimStatus[] = [
      ClaimStatus.APPROVED,
      ClaimStatus.PARTIALLY_APPROVED,
      ClaimStatus.PAID,
    ];

    for (const claim of claims) {
      const key = claim.insuranceId;
      if (!insurerMap.has(key)) {
        insurerMap.set(key, {
          insurerName: claim.insurance.name,
          totalClaims: 0,
          approvedCount: 0,
          rejectedCount: 0,
          pendingCount: 0,
          totalCoveredAmount: 0,
          totalProcessingDays: 0,
          processedCount: 0,
        });
      }

      const entry = insurerMap.get(key)!;
      entry.totalClaims += 1;
      entry.totalCoveredAmount += Number(claim.coveredAmount ?? 0);

      if (approvedStatuses.includes(claim.claimStatus)) {
        entry.approvedCount += 1;
        // Calculate processing days for approved/paid claims
        const resolvedDate = claim.paidAt ?? claim.approvedAt;
        if (resolvedDate) {
          const days = Math.ceil(
            (resolvedDate.getTime() - claim.createdAt.getTime()) /
              (1000 * 60 * 60 * 24),
          );
          entry.totalProcessingDays += days;
          entry.processedCount += 1;
        }
      } else if (claim.claimStatus === ClaimStatus.REJECTED) {
        entry.rejectedCount += 1;
      } else if (pendingStatuses.includes(claim.claimStatus)) {
        entry.pendingCount += 1;
      }
    }

    const result: InsurerBreakdown[] = [];
    for (const [insurerId, data] of insurerMap.entries()) {
      result.push({
        insurerId,
        insurerName: data.insurerName,
        totalClaims: data.totalClaims,
        approvedCount: data.approvedCount,
        rejectedCount: data.rejectedCount,
        pendingCount: data.pendingCount,
        totalCoveredAmount: data.totalCoveredAmount,
        avgProcessingDays:
          data.processedCount > 0
            ? Math.round(
                (data.totalProcessingDays / data.processedCount) * 100,
              ) / 100
            : 0,
      });
    }

    return result;
  }

  async getRejectionAnalysis(
    query: InsuranceReportQuery,
  ): Promise<RejectionAnalysis[]> {
    const where = this.buildWhereClause(query);

    const rejectedClaims = await this.prisma.orderInsurance.findMany({
      where: {
        ...where,
        claimStatus: ClaimStatus.REJECTED,
      },
      select: {
        insuranceId: true,
        rejectionReason: true,
        coveredAmount: true,
        insurance: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Group by insurer + rejection reason
    const groupMap = new Map<
      string,
      {
        insurerId: string;
        insurerName: string;
        rejectionReason: string;
        count: number;
        totalRejectedAmount: number;
      }
    >();

    for (const claim of rejectedClaims) {
      const reason = claim.rejectionReason || 'Unknown';
      const key = `${claim.insuranceId}:${reason}`;

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          insurerId: claim.insuranceId,
          insurerName: claim.insurance.name,
          rejectionReason: reason,
          count: 0,
          totalRejectedAmount: 0,
        });
      }

      const entry = groupMap.get(key)!;
      entry.count += 1;
      entry.totalRejectedAmount += Number(claim.coveredAmount ?? 0);
    }

    return Array.from(groupMap.values());
  }

  async getClaimAging(query: InsuranceReportQuery): Promise<ClaimAgingBucket[]> {
    const where = this.buildWhereClause(query);

    const pendingStatuses: ClaimStatus[] = [
      ClaimStatus.PENDING,
      ClaimStatus.SUBMITTED,
      ClaimStatus.UNDER_REVIEW,
    ];

    const pendingClaims = await this.prisma.orderInsurance.findMany({
      where: {
        ...where,
        claimStatus: { in: pendingStatuses },
      },
      select: {
        createdAt: true,
        coveredAmount: true,
      },
    });

    const now = new Date();
    const buckets: Record<
      '0-30' | '31-60' | '61-90' | '>90',
      { count: number; totalAmount: number }
    > = {
      '0-30': { count: 0, totalAmount: 0 },
      '31-60': { count: 0, totalAmount: 0 },
      '61-90': { count: 0, totalAmount: 0 },
      '>90': { count: 0, totalAmount: 0 },
    };

    for (const claim of pendingClaims) {
      const ageDays = Math.floor(
        (now.getTime() - claim.createdAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      const amount = Number(claim.coveredAmount ?? 0);

      if (ageDays <= 30) {
        buckets['0-30'].count += 1;
        buckets['0-30'].totalAmount += amount;
      } else if (ageDays <= 60) {
        buckets['31-60'].count += 1;
        buckets['31-60'].totalAmount += amount;
      } else if (ageDays <= 90) {
        buckets['61-90'].count += 1;
        buckets['61-90'].totalAmount += amount;
      } else {
        buckets['>90'].count += 1;
        buckets['>90'].totalAmount += amount;
      }
    }

    return (
      Object.entries(buckets) as [
        '0-30' | '31-60' | '61-90' | '>90',
        { count: number; totalAmount: number },
      ][]
    ).map(([bucket, data]) => ({
      bucket,
      count: data.count,
      totalAmount: data.totalAmount,
    }));
  }
}
