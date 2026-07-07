import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

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
}
