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
    // Only consider orders completed in the last 30 days for performance
    const tatStartDate = new Date();
    tatStartDate.setDate(tatStartDate.getDate() - 30);
    tatStartDate.setHours(0, 0, 0, 0);

    const completedOrders = await this.prisma.order.findMany({
      where: {
        approvedAt: { not: null, gte: tatStartDate },
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
      // Critical/abnormal results count — today only
      this.prisma.orderDetail.count({
        where: {
          flag: { in: [Flag.HIGH, Flag.CRITICAL] },
          order: { createdAt: { gte: startOfDay } },
        },
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

  /**
   * #26 + #15: Comparison metrics — today vs yesterday, this week vs last week
   */
  async getComparisonMetrics() {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    const startOfThisWeek = new Date(startOfToday);
    startOfThisWeek.setDate(startOfThisWeek.getDate() - startOfThisWeek.getDay());

    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      ordersToday,
      ordersYesterday,
      revenueToday,
      revenueYesterday,
      patientsThisWeek,
      patientsLastWeek,
      revenueThisMonth,
      revenueLastMonth,
    ] = await Promise.all([
      this.prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
      this.prisma.order.count({ where: { createdAt: { gte: startOfYesterday, lt: startOfToday } } }),
      this.prisma.order.aggregate({ _sum: { amountPaid: true }, where: { paidAt: { gte: startOfToday } } }),
      this.prisma.order.aggregate({ _sum: { amountPaid: true }, where: { paidAt: { gte: startOfYesterday, lt: startOfToday } } }),
      this.prisma.patient.count({ where: { createdAt: { gte: startOfThisWeek }, deletedAt: null } }),
      this.prisma.patient.count({ where: { createdAt: { gte: startOfLastWeek, lt: startOfThisWeek }, deletedAt: null } }),
      this.prisma.order.aggregate({ _sum: { amountPaid: true }, where: { paidAt: { gte: startOfThisMonth } } }),
      this.prisma.order.aggregate({ _sum: { amountPaid: true }, where: { paidAt: { gte: startOfLastMonth, lt: startOfThisMonth } } }),
    ]);

    const revToday = Number(revenueToday._sum.amountPaid ?? 0);
    const revYesterday = Number(revenueYesterday._sum.amountPaid ?? 0);
    const revThisMonth = Number(revenueThisMonth._sum.amountPaid ?? 0);
    const revLastMonth = Number(revenueLastMonth._sum.amountPaid ?? 0);

    return {
      orders: {
        today: ordersToday,
        yesterday: ordersYesterday,
        delta: ordersYesterday > 0 ? Math.round(((ordersToday - ordersYesterday) / ordersYesterday) * 100) : 0,
      },
      revenue: {
        today: revToday,
        yesterday: revYesterday,
        delta: revYesterday > 0 ? Math.round(((revToday - revYesterday) / revYesterday) * 100) : 0,
      },
      patients: {
        thisWeek: patientsThisWeek,
        lastWeek: patientsLastWeek,
        delta: patientsLastWeek > 0 ? Math.round(((patientsThisWeek - patientsLastWeek) / patientsLastWeek) * 100) : 0,
      },
      monthlyRevenue: {
        thisMonth: revThisMonth,
        lastMonth: revLastMonth,
        delta: revLastMonth > 0 ? Math.round(((revThisMonth - revLastMonth) / revLastMonth) * 100) : 0,
      },
    };
  }

  /**
   * #23 + #27: Phased TAT breakdown + SLA monitoring
   */
  async getPhasedTat(slaTargetMinutes = 120) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    startDate.setHours(0, 0, 0, 0);

    const orders = await this.prisma.order.findMany({
      where: {
        approvedAt: { not: null },
        createdAt: { gte: startDate },
      },
      select: {
        id: true,
        orderNumber: true,
        createdAt: true,
        sampleCollectedAt: true,
        verifiedAt: true,
        approvedAt: true,
      },
    });

    if (orders.length === 0) {
      return {
        totalOrders: 0,
        slaTargetMinutes,
        slaCompliance: 100,
        ordersWithinSla: 0,
        ordersExceedingSla: 0,
        phases: { registration_to_sample: 0, sample_to_verification: 0, verification_to_approval: 0, total: 0 },
      };
    }

    let sumRegToSample = 0;
    let sumSampleToVerify = 0;
    let sumVerifyToApproval = 0;
    let sumTotal = 0;
    let countRegToSample = 0;
    let countSampleToVerify = 0;
    let countVerifyToApproval = 0;
    let withinSla = 0;

    for (const o of orders) {
      const totalMin = (o.approvedAt!.getTime() - o.createdAt.getTime()) / 60000;
      sumTotal += totalMin;

      if (totalMin <= slaTargetMinutes) withinSla++;

      if (o.sampleCollectedAt) {
        const regToSample = (o.sampleCollectedAt.getTime() - o.createdAt.getTime()) / 60000;
        sumRegToSample += regToSample;
        countRegToSample++;

        if (o.verifiedAt) {
          const sampleToVerify = (o.verifiedAt.getTime() - o.sampleCollectedAt.getTime()) / 60000;
          sumSampleToVerify += sampleToVerify;
          countSampleToVerify++;

          const verifyToApproval = (o.approvedAt!.getTime() - o.verifiedAt.getTime()) / 60000;
          sumVerifyToApproval += verifyToApproval;
          countVerifyToApproval++;
        }
      }
    }

    return {
      totalOrders: orders.length,
      slaTargetMinutes,
      slaCompliance: Math.round((withinSla / orders.length) * 100),
      ordersWithinSla: withinSla,
      ordersExceedingSla: orders.length - withinSla,
      phases: {
        registration_to_sample: countRegToSample > 0 ? Math.round(sumRegToSample / countRegToSample) : 0,
        sample_to_verification: countSampleToVerify > 0 ? Math.round(sumSampleToVerify / countSampleToVerify) : 0,
        verification_to_approval: countVerifyToApproval > 0 ? Math.round(sumVerifyToApproval / countVerifyToApproval) : 0,
        total: Math.round(sumTotal / orders.length),
      },
    };
  }

  /**
   * #28: Workload distribution — orders processed per analyst (verifiedBy)
   */
  async getWorkloadDistribution() {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    startDate.setHours(0, 0, 0, 0);

    const results = await this.prisma.order.groupBy({
      by: ['verifiedBy'],
      where: {
        verifiedAt: { gte: startDate },
        verifiedBy: { not: null },
      },
      _count: { id: true },
    });

    const userIds = results.map((r) => r.verifiedBy!).filter(Boolean);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, role: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const data = results
      .map((r) => ({
        userId: r.verifiedBy!,
        name: userMap.get(r.verifiedBy!)?.name ?? userMap.get(r.verifiedBy!)?.email ?? 'Unknown',
        role: userMap.get(r.verifiedBy!)?.role ?? 'ANALIS',
        orderCount: r._count.id,
      }))
      .sort((a, b) => b.orderCount - a.orderCount);

    return {
      period: '30 days',
      total: data.reduce((s, d) => s + d.orderCount, 0),
      analysts: data,
    };
  }

  /**
   * #20: Full revenue picture (outstanding + discounts + refunds)
   */
  async getRevenueBreakdown() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [paidAgg, totalAgg, discountAgg, outstandingCount] = await Promise.all([
      this.prisma.order.aggregate({
        _sum: { amountPaid: true },
        where: { paidAt: { gte: startOfMonth } },
      }),
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { createdAt: { gte: startOfMonth } },
      }),
      this.prisma.order.aggregate({
        _sum: { discountAmount: true },
        where: { createdAt: { gte: startOfMonth }, discountAmount: { not: null } },
      }),
      this.prisma.order.count({
        where: {
          createdAt: { gte: startOfMonth },
          status: { in: [OrderStatus.PENDING_PAYMENT] },
        },
      }),
    ]);

    const totalBilled = Number(totalAgg._sum.totalAmount ?? 0);
    const totalPaid = Number(paidAgg._sum.amountPaid ?? 0);
    const totalDiscount = Number(discountAgg._sum.discountAmount ?? 0);
    const outstanding = totalBilled - totalPaid - totalDiscount;

    return {
      period: 'this_month',
      totalBilled,
      totalPaid,
      totalDiscount,
      outstanding: outstanding > 0 ? outstanding : 0,
      outstandingOrderCount: outstandingCount,
    };
  }
}
