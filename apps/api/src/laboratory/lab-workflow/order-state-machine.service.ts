import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { InvalidStateTransitionException } from './exceptions/invalid-state-transition.exception';

export interface TransitionContext {
  userId: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING_PAYMENT]: [OrderStatus.PAID, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.SAMPLE_COLLECTED],
  [OrderStatus.SAMPLE_COLLECTED]: [OrderStatus.IN_ANALYSIS],
  [OrderStatus.IN_ANALYSIS]: [OrderStatus.VERIFIED],
  [OrderStatus.VERIFIED]: [OrderStatus.APPROVED, OrderStatus.IN_ANALYSIS],
  [OrderStatus.APPROVED]: [OrderStatus.NOTIFIED],
  [OrderStatus.NOTIFIED]: [],
  [OrderStatus.CANCELLED]: [],
};

@Injectable()
export class OrderStateMachineService {
  constructor(private readonly prisma: PrismaService) {}

  canTransition(currentStatus: OrderStatus, toStatus: OrderStatus): boolean {
    const validTargets = VALID_TRANSITIONS[currentStatus];
    return validTargets.includes(toStatus);
  }

  getValidTransitions(currentStatus: OrderStatus): OrderStatus[] {
    return VALID_TRANSITIONS[currentStatus] ?? [];
  }

  async transition(
    orderId: string,
    toStatus: OrderStatus,
    context: TransitionContext,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!this.canTransition(order.status, toStatus)) {
      throw new InvalidStateTransitionException(
        order.status,
        toStatus,
        this.getValidTransitions(order.status),
      );
    }

    const updateData = this.buildUpdateData(order.status, toStatus, context);

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: toStatus,
        ...updateData,
      },
      include: {
        patient: true,
        orderDetails: true,
      },
    });
  }

  private buildUpdateData(
    _fromStatus: OrderStatus,
    toStatus: OrderStatus,
    context: TransitionContext,
  ): Record<string, unknown> {
    const now = new Date();

    switch (toStatus) {
      case OrderStatus.PAID:
        return { paidAt: now };
      case OrderStatus.SAMPLE_COLLECTED:
        return {
          sampleCollectedAt: now,
          sampleCollectedBy: context.userId,
        };
      case OrderStatus.VERIFIED:
        return {
          verifiedAt: now,
          verifiedBy: context.userId,
          verificationNotes: context.reason ?? null,
        };
      case OrderStatus.APPROVED:
        return {
          approvedAt: now,
          approvedBy: context.userId,
          interpretation: context.metadata?.interpretation ?? null,
        };
      case OrderStatus.CANCELLED:
        return {
          cancelledAt: now,
          cancelledBy: context.userId,
          cancelReason: context.reason ?? null,
        };
      default:
        return {};
    }
  }
}
