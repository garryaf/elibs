import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateRefundDto } from './dto/create-refund.dto';
import { UpdateRefundStatusDto } from './dto/update-refund-status.dto';
import { Refund, RefundStatus } from '@prisma/client';

@Injectable()
export class RefundService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Create a refund for an order.
   * Validates that the refund amount does not exceed the total paid amount
   * (amountPaid minus any existing approved/pending/processed refunds).
   */
  async createRefund(
    orderId: string,
    dto: CreateRefundDto,
    userId: string,
  ): Promise<Refund> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        amountPaid: true,
        orderNumber: true,
        refunds: {
          where: {
            status: {
              in: [
                RefundStatus.PENDING,
                RefundStatus.APPROVED,
                RefundStatus.PROCESSED,
              ],
            },
          },
          select: { amount: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!order.amountPaid || order.amountPaid.equals(new Decimal(0))) {
      throw new BadRequestException({
        errorCode: 'ERR_REFUND_EXCEEDS_PAYMENT',
        message: 'Cannot refund an order that has not been paid.',
      });
    }

    // Calculate total already refunded (pending + approved + processed)
    const totalRefunded = order.refunds.reduce(
      (sum, refund) => sum.plus(refund.amount),
      new Decimal(0),
    );

    const refundAmount = new Decimal(dto.amount);
    const availableForRefund = order.amountPaid.minus(totalRefunded);

    if (refundAmount.gt(availableForRefund)) {
      throw new BadRequestException({
        errorCode: 'ERR_REFUND_EXCEEDS_PAYMENT',
        message: `Refund amount (${refundAmount.toString()}) exceeds available refundable amount (${availableForRefund.toString()}). Paid: ${order.amountPaid.toString()}, already refunded: ${totalRefunded.toString()}.`,
      });
    }

    const refund = await this.prisma.refund.create({
      data: {
        orderId,
        amount: refundAmount,
        reason: dto.reason,
        status: RefundStatus.PENDING,
        refundMethod: dto.refundMethod || null,
      },
    });

    // Audit log
    await this.auditService.log(
      userId,
      'REFUND_CREATED',
      'Refund',
      refund.id,
      null,
      {
        orderId,
        orderNumber: order.orderNumber,
        amount: dto.amount,
        reason: dto.reason,
        refundMethod: dto.refundMethod || null,
      },
      null,
    );

    return refund;
  }

  /**
   * Get all refunds for an order.
   */
  async getRefundsByOrder(orderId: string): Promise<Refund[]> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.prisma.refund.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listRefunds(params: {
    page?: number;
    limit?: number;
    status?: RefundStatus;
    search?: string;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const where = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.search
        ? {
            order: {
              OR: [
                { orderNumber: { contains: params.search, mode: 'insensitive' as const } },
                {
                  patient: {
                    OR: [
                      { name: { contains: params.search, mode: 'insensitive' as const } },
                      { mrn: { contains: params.search, mode: 'insensitive' as const } },
                    ],
                  },
                },
              ],
            },
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.refund.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              totalAmount: true,
              amountPaid: true,
              patient: { select: { id: true, name: true, mrn: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.refund.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async updateStatus(
    refundId: string,
    dto: UpdateRefundStatusDto,
    userId: string,
  ): Promise<Refund> {
    const refund = await this.prisma.refund.findUnique({ where: { id: refundId } });
    if (!refund) throw new NotFoundException('Refund not found');

    const allowedTransitions: Record<RefundStatus, RefundStatus[]> = {
      [RefundStatus.PENDING]: [RefundStatus.APPROVED, RefundStatus.REJECTED],
      [RefundStatus.APPROVED]: [RefundStatus.PROCESSED],
      [RefundStatus.PROCESSED]: [],
      [RefundStatus.REJECTED]: [],
    };
    if (!allowedTransitions[refund.status].includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition refund from ${refund.status} to ${dto.status}`,
      );
    }
    if (dto.status === RefundStatus.PROCESSED && !dto.reference?.trim()) {
      throw new BadRequestException('Settlement reference is required to process a refund');
    }

    const updated = await this.prisma.refund.update({
      where: { id: refundId },
      data: {
        status: dto.status,
        ...(dto.status === RefundStatus.PROCESSED
          ? { processedAt: new Date(), processedBy: userId, reference: dto.reference!.trim() }
          : {}),
      },
    });
    await this.auditService.log(
      userId,
      `REFUND_${dto.status}`,
      'Refund',
      refundId,
      { status: refund.status },
      { status: dto.status, reference: dto.reference ?? null },
      null,
    );
    return updated;
  }
}
