import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { InvalidStateTransitionException } from './exceptions/invalid-state-transition.exception';

export interface TransitionContext {
  userId: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING_PAYMENT]: [OrderStatus.PAID, OrderStatus.DEPOSIT_RECEIVED, OrderStatus.PAYMENT_OVERDUE, OrderStatus.CANCELLED],
  [OrderStatus.PAYMENT_OVERDUE]: [OrderStatus.PAID, OrderStatus.DEPOSIT_RECEIVED, OrderStatus.CANCELLED],
  [OrderStatus.DEPOSIT_RECEIVED]: [OrderStatus.PAID, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.SAMPLE_COLLECTED],
  [OrderStatus.SAMPLE_COLLECTED]: [OrderStatus.IN_ANALYSIS],
  [OrderStatus.IN_ANALYSIS]: [OrderStatus.VERIFIED],
  [OrderStatus.VERIFIED]: [OrderStatus.APPROVED, OrderStatus.IN_ANALYSIS],
  [OrderStatus.APPROVED]: [OrderStatus.NOTIFIED, OrderStatus.IN_ANALYSIS],
  [OrderStatus.NOTIFIED]: [OrderStatus.IN_ANALYSIS],
  [OrderStatus.CANCELLED]: [],
};

@Injectable()
export class OrderStateMachineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

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
      throw new NotFoundException({ errorCode: 'ERR_NOT_FOUND', message: 'Order not found' });
    }

    if (!this.canTransition(order.status, toStatus)) {
      throw new InvalidStateTransitionException(
        order.status,
        toStatus,
        this.getValidTransitions(order.status),
      );
    }

    const updateData = this.buildUpdateData(order.status, toStatus, context);

    const updatedOrder = await this.prisma.order.update({
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

    // Explicitly log audit trail with real userId (Requirements 10.3, 15.5)
    await this.auditService.log(
      context.userId,
      'ORDER_STATE_TRANSITION',
      'Order',
      orderId,
      { status: order.status },
      {
        status: toStatus,
        reason: context.reason ?? null,
        ...(context.metadata ?? {}),
      },
    );

    return updatedOrder;
  }

  private buildUpdateData(
    _fromStatus: OrderStatus,
    toStatus: OrderStatus,
    context: TransitionContext,
  ): Record<string, unknown> {
    const now = new Date();

    switch (toStatus) {
      case OrderStatus.DEPOSIT_RECEIVED:
        return {};
      case OrderStatus.PAID:
        return { paidAt: now, paidBy: context.userId };
      case OrderStatus.SAMPLE_COLLECTED:
        return {
          sampleCollectedAt: now,
          sampleCollectedBy: context.userId,
        };
      case OrderStatus.IN_ANALYSIS:
        // Only set rejection fields if coming from VERIFIED (rejection scenario)
        if (_fromStatus === OrderStatus.VERIFIED) {
          return {
            rejectedAt: now,
            rejectedBy: context.userId,
            rejectedReason: context.reason ?? null,
          };
        }
        // Recall from APPROVED or NOTIFIED
        if (_fromStatus === OrderStatus.APPROVED || _fromStatus === OrderStatus.NOTIFIED) {
          return {
            rejectedAt: now,
            rejectedBy: context.userId,
            rejectedReason: context.reason ?? null,
          };
        }
        return {};
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
      case OrderStatus.NOTIFIED:
        return { notifiedAt: now };
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
