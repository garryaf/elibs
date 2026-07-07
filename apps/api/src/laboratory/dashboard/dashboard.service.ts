import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Flag, OrderStatus } from '@prisma/client';
import { RegionDistributionQueryDto } from './dto/region-distribution-query.dto';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getLabSummary() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Total orders today
    const totalOrdersToday = await this.prisma.order.count({
      where: {
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    });

    // Orders grouped by status
    const ordersByStatus = await this.prisma.order.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const ordersByStatusMap = ordersByStatus.reduce(
      (acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Average TAT: approvedAt minus sampleCollectedAt in minutes
    const completedOrders = await this.prisma.order.findMany({
      where: {
        approvedAt: { not: null },
        sampleCollectedAt: { not: null },
      },
      select: { approvedAt: true, sampleCollectedAt: true },
    });

    const tatMinutes = completedOrders.map(
      (o) =>
        (o.approvedAt!.getTime() - o.sampleCollectedAt!.getTime()) / 60000,
    );
    const averageTat =
      tatMinutes.length > 0
        ? tatMinutes.reduce((a, b) => a + b, 0) / tatMinutes.length
        : 0;

    // Pending approval count: orders with status VERIFIED
    const pendingApprovalCount = await this.prisma.order.count({
      where: { status: OrderStatus.VERIFIED },
    });

    // Queue counts per status for operational monitoring
    const queueStatuses = [
      OrderStatus.PAID,
      OrderStatus.SAMPLE_COLLECTED,
      OrderStatus.IN_ANALYSIS,
      OrderStatus.VERIFIED,
    ] as const;

    const queueCounts: Record<string, number> = {};
    for (const status of queueStatuses) {
      queueCounts[status] = ordersByStatusMap[status] || 0;
    }

    return {
      totalOrdersToday,
      ordersByStatus: ordersByStatusMap,
      averageTat: Math.round(averageTat * 100) / 100,
      pendingApprovalCount,
      queueCounts,
    };
  }

  async getRegionDistribution(filters: RegionDistributionQueryDto) {
    const { provinsiId, kabupatenKotaId, kecamatanId } = filters;

    // Determine grouping level based on filters (most specific filter wins)
    if (kecamatanId) {
      // Group by KelurahanDesa within the specified kecamatan
      const groups = await this.prisma.patient.groupBy({
        by: ['kelurahanDesaId'],
        where: {
          deletedAt: null,
          kecamatanId,
          kelurahanDesaId: { not: null },
        },
        _count: { id: true },
      });

      const kelurahanIds = groups
        .map((g) => g.kelurahanDesaId)
        .filter((id): id is string => id !== null);

      const kelurahanRecords = await this.prisma.kelurahanDesa.findMany({
        where: { id: { in: kelurahanIds } },
        select: { id: true, name: true },
      });

      const nameMap = new Map(kelurahanRecords.map((r) => [r.id, r.name]));

      return groups.map((g) => ({
        id: g.kelurahanDesaId!,
        name: nameMap.get(g.kelurahanDesaId!) || '',
        count: g._count.id,
      }));
    }

    if (kabupatenKotaId) {
      // Group by Kecamatan within the specified kabupaten/kota
      const groups = await this.prisma.patient.groupBy({
        by: ['kecamatanId'],
        where: {
          deletedAt: null,
          kabupatenKotaId,
          kecamatanId: { not: null },
        },
        _count: { id: true },
      });

      const kecamatanIds = groups
        .map((g) => g.kecamatanId)
        .filter((id): id is string => id !== null);

      const kecamatanRecords = await this.prisma.kecamatan.findMany({
        where: { id: { in: kecamatanIds } },
        select: { id: true, name: true },
      });

      const nameMap = new Map(kecamatanRecords.map((r) => [r.id, r.name]));

      return groups.map((g) => ({
        id: g.kecamatanId!,
        name: nameMap.get(g.kecamatanId!) || '',
        count: g._count.id,
      }));
    }

    if (provinsiId) {
      // Group by KabupatenKota within the specified provinsi
      const groups = await this.prisma.patient.groupBy({
        by: ['kabupatenKotaId'],
        where: {
          deletedAt: null,
          provinsiId,
          kabupatenKotaId: { not: null },
        },
        _count: { id: true },
      });

      const kabupatenKotaIds = groups
        .map((g) => g.kabupatenKotaId)
        .filter((id): id is string => id !== null);

      const kabupatenKotaRecords = await this.prisma.kabupatenKota.findMany({
        where: { id: { in: kabupatenKotaIds } },
        select: { id: true, name: true },
      });

      const nameMap = new Map(
        kabupatenKotaRecords.map((r) => [r.id, r.name]),
      );

      return groups.map((g) => ({
        id: g.kabupatenKotaId!,
        name: nameMap.get(g.kabupatenKotaId!) || '',
        count: g._count.id,
      }));
    }

    // No filter: group by Provinsi
    const groups = await this.prisma.patient.groupBy({
      by: ['provinsiId'],
      where: {
        deletedAt: null,
        provinsiId: { not: null },
      },
      _count: { id: true },
    });

    const provinsiIds = groups
      .map((g) => g.provinsiId)
      .filter((id): id is string => id !== null);

    const provinsiRecords = await this.prisma.provinsi.findMany({
      where: { id: { in: provinsiIds } },
      select: { id: true, name: true },
    });

    const nameMap = new Map(provinsiRecords.map((r) => [r.id, r.name]));

    return groups.map((g) => ({
      id: g.provinsiId!,
      name: nameMap.get(g.provinsiId!) || '',
      count: g._count.id,
    }));
  }

  async getLabVolume(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const volumeMap = new Map<string, number>();
    for (const order of orders) {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      volumeMap.set(dateKey, (volumeMap.get(dateKey) || 0) + 1);
    }

    const volume: { date: string; count: number }[] = [];
    for (const [date, count] of volumeMap) {
      volume.push({ date, count });
    }

    return volume;
  }

  async getExecutiveSummary() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      patientsToday,
      totalPatients,
      revenueTodayAgg,
      totalRevenueMonthAgg,
      criticalResults,
      pendingSampleCollection,
      completedToday,
    ] = await Promise.all([
      // Patients registered today
      this.prisma.patient.count({
        where: { createdAt: { gte: startOfDay }, deletedAt: null },
      }),
      // Total active patients
      this.prisma.patient.count({
        where: { deletedAt: null },
      }),
      // Revenue today (sum of amountPaid where paidAt >= today)
      this.prisma.order.aggregate({
        _sum: { amountPaid: true },
        where: { paidAt: { gte: startOfDay } },
      }),
      // Total revenue this month
      this.prisma.order.aggregate({
        _sum: { amountPaid: true },
        where: { paidAt: { gte: startOfMonth } },
      }),
      // Critical/abnormal results count
      this.prisma.orderDetail.count({
        where: { flag: { in: [Flag.HIGH, Flag.CRITICAL] } },
      }),
      // Orders waiting for sample collection (status = PAID)
      this.prisma.order.count({
        where: { status: OrderStatus.PAID },
      }),
      // Orders completed (approved) today
      this.prisma.order.count({
        where: { approvedAt: { gte: startOfDay } },
      }),
    ]);

    return {
      patientsToday,
      totalPatients,
      revenueToday: Number(revenueTodayAgg._sum.amountPaid ?? 0),
      totalRevenueMonth: Number(totalRevenueMonthAgg._sum.amountPaid ?? 0),
      criticalResults,
      pendingSampleCollection,
      completedToday,
    };
  }

  async getRecentOrders(limit = 5) {
    return this.prisma.order.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        patient: { select: { name: true, mrn: true } },
      },
    });
  }
}
