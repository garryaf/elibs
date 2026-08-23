import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BatchInvoiceStatus, OrderStatus } from '@prisma/client';
import { CreateBatchInvoiceDto, UpdateBatchInvoiceStatusDto } from './dto/batch-invoice.dto';

const MAX_ORDERS_PER_BATCH = 500;

@Injectable()
export class BatchInvoiceService {
  constructor(private readonly prisma: PrismaService) {}

  async createBatchInvoice(dto: CreateBatchInvoiceDto) {
    // Validate insurance exists, is not soft-deleted, and is CORPORATE type
    const insurance = await this.prisma.insurance.findFirst({
      where: { id: dto.insuranceId, deletedAt: null },
    });

    if (!insurance) {
      throw new NotFoundException('Insurance not found');
    }

    if (insurance.type !== 'CORPORATE') {
      throw new BadRequestException(
        'Batch invoicing is only available for CORPORATE insurance type',
      );
    }

    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);

    if (periodStart >= periodEnd) {
      throw new BadRequestException('periodStart must be before periodEnd');
    }

    // Find all PAID orders for this insurance within the period
    // that are NOT already included in another batch invoice
    // Requirement 6.5: Query via OrderInsurance junction with coverageType PRIMARY
    const eligibleOrdersWhere = {
      orderInsurances: {
        some: {
          insuranceId: dto.insuranceId,
          coverageType: 'PRIMARY' as const,
        },
      },
      status: OrderStatus.PAID,
      paidAt: {
        gte: periodStart,
        lte: periodEnd,
      },
      batchInvoiceItems: {
        none: {},
      },
    };

    // Count total eligible to detect truncation
    const totalEligible = await this.prisma.order.count({
      where: eligibleOrdersWhere,
    });

    const eligibleOrders = await this.prisma.order.findMany({
      where: eligibleOrdersWhere,
      select: {
        id: true,
        totalAmount: true,
      },
      orderBy: { paidAt: 'asc' },
      take: MAX_ORDERS_PER_BATCH,
    });

    if (eligibleOrders.length === 0) {
      throw new BadRequestException(
        'Tidak ada order yang eligible untuk asuransi dan periode yang dipilih. Pastikan ada order dengan status PAID dan asuransi korporat sebagai PRIMARY coverage dalam rentang tanggal tersebut.',
      );
    }

    const truncated = totalEligible > MAX_ORDERS_PER_BATCH;

    // Calculate total amount
    const totalAmount = eligibleOrders.reduce(
      (sum, order) => sum.plus(order.totalAmount),
      new Decimal(0),
    );

    // Create batch invoice with items in a transaction
    const batchInvoice = await this.prisma.$transaction(async (tx) => {
      // Generate invoice number inside transaction to avoid sequence gaps
      const invoiceNum = await this.generateInvoiceNumber(tx);

      const invoice = await tx.batchInvoice.create({
        data: {
          invoiceNumber: invoiceNum,
          insuranceId: dto.insuranceId,
          periodStart,
          periodEnd,
          totalAmount,
          orderCount: eligibleOrders.length,
          status: BatchInvoiceStatus.DRAFT,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          notes: dto.notes || null,
          items: {
            createMany: {
              data: eligibleOrders.map((order) => ({
                orderId: order.id,
              })),
            },
          },
        },
        include: {
          insurance: { select: { id: true, code: true, name: true, type: true } },
          items: {
            include: {
              order: {
                select: { id: true, orderNumber: true, totalAmount: true, paidAt: true },
              },
            },
          },
        },
      });

      return invoice;
    });

    return {
      ...batchInvoice,
      _meta: {
        totalEligible,
        included: eligibleOrders.length,
        truncated,
        maxOrdersPerBatch: MAX_ORDERS_PER_BATCH,
      },
    };
  }

  async previewEligibleOrders(params: {
    insuranceId: string;
    periodStart: string;
    periodEnd: string;
  }) {
    if (!params.insuranceId || !params.periodStart || !params.periodEnd) {
      throw new BadRequestException('insuranceId, periodStart, and periodEnd are required');
    }

    const insurance = await this.prisma.insurance.findFirst({
      where: { id: params.insuranceId, deletedAt: null },
    });

    if (!insurance) {
      throw new NotFoundException('Insurance not found');
    }

    if (insurance.type !== 'CORPORATE') {
      throw new BadRequestException(
        'Batch invoicing is only available for CORPORATE insurance type',
      );
    }

    const periodStart = new Date(params.periodStart);
    const periodEnd = new Date(params.periodEnd);

    if (periodStart >= periodEnd) {
      throw new BadRequestException('periodStart must be before periodEnd');
    }

    const eligibleOrdersWhere = {
      orderInsurances: {
        some: {
          insuranceId: params.insuranceId,
          coverageType: 'PRIMARY' as const,
        },
      },
      status: OrderStatus.PAID,
      paidAt: {
        gte: periodStart,
        lte: periodEnd,
      },
      batchInvoiceItems: {
        none: {},
      },
    };

    const [totalEligible, orders] = await Promise.all([
      this.prisma.order.count({ where: eligibleOrdersWhere }),
      this.prisma.order.findMany({
        where: eligibleOrdersWhere,
        select: {
          id: true,
          orderNumber: true,
          totalAmount: true,
          paidAt: true,
          patient: { select: { id: true, name: true, mrn: true } },
        },
        orderBy: { paidAt: 'asc' },
        take: MAX_ORDERS_PER_BATCH,
      }),
    ]);

    const totalAmount = orders.reduce(
      (sum, order) => sum.plus(order.totalAmount),
      new Decimal(0),
    );

    return {
      insurance: { id: insurance.id, code: insurance.code, name: insurance.name, type: insurance.type },
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      totalEligible,
      included: orders.length,
      truncated: totalEligible > MAX_ORDERS_PER_BATCH,
      maxOrdersPerBatch: MAX_ORDERS_PER_BATCH,
      totalAmount,
      orders,
    };
  }

  async getBatchInvoices(params?: {
    insuranceId?: string;
    status?: BatchInvoiceStatus;
    page?: number;
    limit?: number;
  }) {
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (params?.insuranceId) {
      where.insuranceId = params.insuranceId;
    }
    if (params?.status) {
      where.status = params.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.batchInvoice.findMany({
        where,
        include: {
          insurance: { select: { id: true, code: true, name: true, type: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.batchInvoice.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getBatchInvoiceById(id: string) {
    const batchInvoice = await this.prisma.batchInvoice.findUnique({
      where: { id },
      include: {
        insurance: { select: { id: true, code: true, name: true, type: true } },
        items: {
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                totalAmount: true,
                paidAt: true,
                patient: { select: { id: true, name: true, mrn: true } },
              },
            },
          },
        },
      },
    });

    if (!batchInvoice) {
      throw new NotFoundException('Batch invoice not found');
    }

    return batchInvoice;
  }

  async updateBatchInvoiceStatus(id: string, dto: UpdateBatchInvoiceStatusDto) {
    const batchInvoice = await this.prisma.batchInvoice.findUnique({
      where: { id },
    });

    if (!batchInvoice) {
      throw new NotFoundException('Batch invoice not found');
    }

    // Validate status transitions
    this.validateStatusTransition(batchInvoice.status, dto.status);

    // Validate paidAmount does not exceed totalAmount
    if (dto.paidAmount !== undefined) {
      const totalAmount = Number(batchInvoice.totalAmount);
      if (dto.paidAmount > totalAmount) {
        throw new BadRequestException(
          `paidAmount (${dto.paidAmount}) cannot exceed totalAmount (${totalAmount})`,
        );
      }
      if (dto.paidAmount < 0) {
        throw new BadRequestException('paidAmount cannot be negative');
      }
    }

    const updateData: Record<string, unknown> = {
      status: dto.status,
    };

    if (dto.notes !== undefined) {
      updateData.notes = dto.notes;
    }

    // Set sentAt when transitioning to SENT
    if (dto.status === BatchInvoiceStatus.SENT) {
      updateData.sentAt = new Date();
    }

    // Set paidAt and paidAmount when transitioning to PAID or PARTIALLY_PAID
    if (
      dto.status === BatchInvoiceStatus.PAID ||
      dto.status === BatchInvoiceStatus.PARTIALLY_PAID
    ) {
      updateData.paidAt = new Date();
      if (dto.paidAmount !== undefined) {
        updateData.paidAmount = dto.paidAmount;
      }
    }

    const updated = await this.prisma.batchInvoice.update({
      where: { id },
      data: updateData,
      include: {
        insurance: { select: { id: true, code: true, name: true, type: true } },
      },
    });

    return updated;
  }

  async cancelBatchInvoice(id: string) {
    const batchInvoice = await this.prisma.batchInvoice.findUnique({
      where: { id },
    });

    if (!batchInvoice) {
      throw new NotFoundException('Batch invoice not found');
    }

    if (
      batchInvoice.status === BatchInvoiceStatus.PAID ||
      batchInvoice.status === BatchInvoiceStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot cancel a batch invoice with status ${batchInvoice.status}`,
      );
    }

    // Cancel in a transaction: delete all items first (releases orders for re-batching),
    // then update status to CANCELLED
    const updated = await this.prisma.$transaction(async (tx) => {
      // Delete all batch invoice items so orders become eligible again
      await tx.batchInvoiceItem.deleteMany({
        where: { batchInvoiceId: id },
      });

      return tx.batchInvoice.update({
        where: { id },
        data: {
          status: BatchInvoiceStatus.CANCELLED,
          orderCount: 0,
        },
        include: {
          insurance: { select: { id: true, code: true, name: true, type: true } },
        },
      });
    });

    return updated;
  }

  private validateStatusTransition(
    currentStatus: BatchInvoiceStatus,
    newStatus: BatchInvoiceStatus,
  ) {
    const allowedTransitions: Record<BatchInvoiceStatus, BatchInvoiceStatus[]> = {
      [BatchInvoiceStatus.DRAFT]: [BatchInvoiceStatus.SENT, BatchInvoiceStatus.CANCELLED],
      [BatchInvoiceStatus.SENT]: [
        BatchInvoiceStatus.PAID,
        BatchInvoiceStatus.PARTIALLY_PAID,
        BatchInvoiceStatus.OVERDUE,
        BatchInvoiceStatus.CANCELLED,
      ],
      [BatchInvoiceStatus.PARTIALLY_PAID]: [
        BatchInvoiceStatus.PAID,
        BatchInvoiceStatus.OVERDUE,
        BatchInvoiceStatus.CANCELLED,
      ],
      [BatchInvoiceStatus.OVERDUE]: [
        BatchInvoiceStatus.PAID,
        BatchInvoiceStatus.PARTIALLY_PAID,
        BatchInvoiceStatus.CANCELLED,
      ],
      [BatchInvoiceStatus.PAID]: [],
      [BatchInvoiceStatus.CANCELLED]: [],
    };

    const allowed = allowedTransitions[currentStatus];
    if (!allowed || !allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  private async generateInvoiceNumber(tx?: { batchInvoiceSequence: { upsert: typeof this.prisma.batchInvoiceSequence.upsert } }): Promise<string> {
    const client = tx || this.prisma;
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const sequenceId = yearMonth;

    // Upsert sequence record and increment
    const sequence = await client.batchInvoiceSequence.upsert({
      where: { id: sequenceId },
      update: { lastValue: { increment: 1 } },
      create: { id: sequenceId, lastValue: 1 },
    });

    const seqNumber = String(sequence.lastValue).padStart(4, '0');
    return `INV-${yearMonth}-${seqNumber}`;
  }
}
