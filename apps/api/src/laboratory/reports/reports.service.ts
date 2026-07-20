import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ReportQueryDto } from './dto/report-query.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private getDateRange(query: ReportQueryDto): { gte: Date; lte: Date } {
    const now = new Date();
    const gte = query.startDate
      ? new Date(query.startDate)
      : new Date(now.getFullYear(), now.getMonth(), 1); // Default: start of current month
    const lte = query.endDate ? new Date(query.endDate) : now;
    // Set end of day for lte
    lte.setHours(23, 59, 59, 999);
    return { gte, lte };
  }

  /**
   * Revenue summary grouped by day/week/month within the date range.
   */
  async getRevenueSummary(query: ReportQueryDto) {
    const { gte, lte } = this.getDateRange(query);

    const orders = await this.prisma.order.findMany({
      where: {
        paidAt: { gte, lte },
        amountPaid: { not: null },
      },
      select: {
        paidAt: true,
        amountPaid: true,
        totalAmount: true,
      },
      orderBy: { paidAt: 'asc' },
    });

    // Group by day
    const dailyMap = new Map<string, { revenue: number; count: number }>();
    for (const order of orders) {
      if (!order.paidAt) continue;
      const dateKey = order.paidAt.toISOString().split('T')[0];
      const existing = dailyMap.get(dateKey) || { revenue: 0, count: 0 };
      existing.revenue += Number(order.amountPaid ?? 0);
      existing.count += 1;
      dailyMap.set(dateKey, existing);
    }

    const daily = Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      revenue: data.revenue,
      orderCount: data.count,
    }));

    const totalRevenue = orders.reduce(
      (sum, o) => sum + Number(o.amountPaid ?? 0),
      0,
    );

    return {
      startDate: gte.toISOString().split('T')[0],
      endDate: lte.toISOString().split('T')[0],
      totalRevenue,
      totalOrders: orders.length,
      daily,
    };
  }

  /**
   * Orders grouped by status.
   */
  async getOrdersByStatus(query: ReportQueryDto) {
    const { gte, lte } = this.getDateRange(query);

    const result = await this.prisma.order.groupBy({
      by: ['status'],
      where: { createdAt: { gte, lte } },
      _count: { id: true },
    });

    const data = result.map((item) => ({
      status: item.status,
      count: item._count.id,
    }));

    const total = data.reduce((sum, d) => sum + d.count, 0);

    return { startDate: gte.toISOString().split('T')[0], endDate: lte.toISOString().split('T')[0], total, data };
  }

  /**
   * Revenue grouped by payment method.
   */
  async getOrdersByPaymentMethod(query: ReportQueryDto) {
    const { gte, lte } = this.getDateRange(query);

    const result = await this.prisma.order.groupBy({
      by: ['paymentMethod'],
      where: {
        paidAt: { gte, lte },
        paymentMethod: { not: null },
      },
      _sum: { amountPaid: true },
      _count: { id: true },
    });

    const data = result.map((item) => ({
      paymentMethod: item.paymentMethod,
      revenue: Number(item._sum.amountPaid ?? 0),
      count: item._count.id,
    }));

    const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);

    return { startDate: gte.toISOString().split('T')[0], endDate: lte.toISOString().split('T')[0], totalRevenue, data };
  }

  /**
   * Most ordered tests (top N).
   */
  async getTopTests(query: ReportQueryDto) {
    const { gte, lte } = this.getDateRange(query);
    const limit = query.limit ?? 10;

    const result = await this.prisma.orderDetail.groupBy({
      by: ['testId'],
      where: {
        order: { createdAt: { gte, lte } },
      },
      _count: { id: true },
      _sum: { finalPrice: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    // Fetch test names
    const testIds = result.map((r) => r.testId);
    const tests = await this.prisma.testMaster.findMany({
      where: { id: { in: testIds } },
      select: { id: true, name: true, code: true },
    });
    const testMap = new Map(tests.map((t) => [t.id, t]));

    const data = result.map((item) => ({
      testId: item.testId,
      testName: testMap.get(item.testId)?.name ?? 'Unknown',
      testCode: testMap.get(item.testId)?.code ?? '',
      orderCount: item._count.id,
      totalRevenue: Number(item._sum.finalPrice ?? 0),
    }));

    return { startDate: gte.toISOString().split('T')[0], endDate: lte.toISOString().split('T')[0], limit, data };
  }

  /**
   * Insurance claims summary (grouped by claim status).
   */
  async getInsuranceClaims(query: ReportQueryDto) {
    const { gte, lte } = this.getDateRange(query);

    const result = await this.prisma.orderInsurance.groupBy({
      by: ['claimStatus'],
      where: { createdAt: { gte, lte } },
      _count: { id: true },
      _sum: { coveredAmount: true },
    });

    const data = result.map((item) => ({
      claimStatus: item.claimStatus,
      count: item._count.id,
      totalCoveredAmount: Number(item._sum.coveredAmount ?? 0),
    }));

    const totalClaims = data.reduce((sum, d) => sum + d.count, 0);
    const totalCoveredAmount = data.reduce(
      (sum, d) => sum + d.totalCoveredAmount,
      0,
    );

    return {
      startDate: gte.toISOString().split('T')[0],
      endDate: lte.toISOString().split('T')[0],
      totalClaims,
      totalCoveredAmount,
      data,
    };
  }

  /**
   * Orders grouped by referring doctor.
   */
  async getByReferringDoctor(query: ReportQueryDto) {
    const { gte, lte } = this.getDateRange(query);

    const results = await this.prisma.order.groupBy({
      by: ['doctorId'],
      where: {
        createdAt: { gte, lte },
        doctorId: { not: null },
        status: { not: 'CANCELLED' },
      },
      _count: { id: true },
      _sum: { totalAmount: true },
    });

    // Enrich with doctor names
    const doctorIds = results
      .map((r) => r.doctorId!)
      .filter(Boolean);
    const doctors = await this.prisma.doctor.findMany({
      where: { id: { in: doctorIds } },
      select: { id: true, name: true, code: true, specialization: true },
    });
    const doctorMap = new Map(doctors.map((d) => [d.id, d]));

    const data = results.map((r) => ({
      doctor: doctorMap.get(r.doctorId!) ?? { id: r.doctorId, name: 'Unknown' },
      orderCount: r._count.id,
      totalRevenue: Number(r._sum.totalAmount ?? 0),
    }));

    return {
      startDate: gte.toISOString().split('T')[0],
      endDate: lte.toISOString().split('T')[0],
      total: data.length,
      data,
    };
  }

  /**
   * Orders grouped by referring clinic.
   */
  async getByReferringClinic(query: ReportQueryDto) {
    const { gte, lte } = this.getDateRange(query);

    const results = await this.prisma.order.groupBy({
      by: ['clinicId'],
      where: {
        createdAt: { gte, lte },
        clinicId: { not: null },
        status: { not: 'CANCELLED' },
      },
      _count: { id: true },
      _sum: { totalAmount: true },
    });

    // Enrich with clinic names
    const clinicIds = results
      .map((r) => r.clinicId!)
      .filter(Boolean);
    const clinics = await this.prisma.clinic.findMany({
      where: { id: { in: clinicIds } },
      select: { id: true, name: true, code: true },
    });
    const clinicMap = new Map(clinics.map((c) => [c.id, c]));

    const data = results.map((r) => ({
      clinic: clinicMap.get(r.clinicId!) ?? { id: r.clinicId, name: 'Unknown' },
      orderCount: r._count.id,
      totalRevenue: Number(r._sum.totalAmount ?? 0),
    }));

    return {
      startDate: gte.toISOString().split('T')[0],
      endDate: lte.toISOString().split('T')[0],
      total: data.length,
      data,
    };
  }

  /**
   * New patient registrations within the date range.
   */
  async getNewPatients(query: ReportQueryDto) {
    const { gte, lte } = this.getDateRange(query);
    const limit = query.limit ?? 100;

    const where = {
      createdAt: { gte, lte },
      deletedAt: null,
    };

    const [patients, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        select: {
          id: true,
          mrn: true,
          name: true,
          gender: true,
          dateOfBirth: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.patient.count({ where }),
    ]);

    return {
      startDate: gte.toISOString().split('T')[0],
      endDate: lte.toISOString().split('T')[0],
      total,
      data: patients,
    };
  }

  /**
   * Average turnaround time from order creation to result approval.
   */
  async getTurnaroundTime(query: ReportQueryDto) {
    const { gte, lte } = this.getDateRange(query);
    const limit = query.limit ?? 100;

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte, lte },
        approvedAt: { not: null },
      },
      select: {
        id: true,
        orderNumber: true,
        createdAt: true,
        sampleCollectedAt: true,
        approvedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    if (orders.length === 0) {
      return {
        startDate: gte.toISOString().split('T')[0],
        endDate: lte.toISOString().split('T')[0],
        totalOrders: 0,
        averageTatMinutes: 0,
        averageTatHours: 0,
        breakdown: [],
      };
    }

    const breakdown = orders.map((order) => {
      const totalMinutes =
        (order.approvedAt!.getTime() - order.createdAt.getTime()) / 60000;
      const sampleToApprovalMinutes = order.sampleCollectedAt
        ? (order.approvedAt!.getTime() - order.sampleCollectedAt.getTime()) /
          60000
        : null;

      return {
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        approvedAt: order.approvedAt,
        totalMinutes: Math.round(totalMinutes * 100) / 100,
        sampleToApprovalMinutes: sampleToApprovalMinutes
          ? Math.round(sampleToApprovalMinutes * 100) / 100
          : null,
      };
    });

    const totalTatMinutes = breakdown.reduce(
      (sum, o) => sum + o.totalMinutes,
      0,
    );
    const averageTatMinutes =
      Math.round((totalTatMinutes / breakdown.length) * 100) / 100;

    return {
      startDate: gte.toISOString().split('T')[0],
      endDate: lte.toISOString().split('T')[0],
      totalOrders: orders.length,
      averageTatMinutes,
      averageTatHours: Math.round((averageTatMinutes / 60) * 100) / 100,
      breakdown,
    };
  }
}
