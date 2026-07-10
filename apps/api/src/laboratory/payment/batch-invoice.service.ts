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
    // Validate insurance exists and is CORPORATE type
    const insurance = await this.prisma.insurance.findUnique({
      where: { id: dto.insuranceId },
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
    const eligibleOrders = await this.prisma.order.findMany({
      where: {
        insuranceId: dto.insuranceId,
        status: OrderStatus.PAID,
        paidAt: {
          gte: periodStart,
          lte: periodEnd,
        },
        batchInvoiceItems: {
          none: {},
        },
      },
      select: {
        id: true,
        totalAmount: true,
      },
      orderBy: { paidAt: 'asc' },
      take: MAX_ORDERS_PER_BATCH,
    });

    if (eligibleOrders.length === 0) {
      throw new BadRequestException(
        'No eligible orders found for the given insurance and period',
      );
    }

    // Calculate total amount
    const totalAmount = eligibleOrders.reduce(
      (sum, order) => sum.plus(order.totalAmount),
      new Decimal(0),
    );

    // Generate invoice number: INV-YYYYMM-XXXX
    const invoiceNumber = await this.generateInvoiceNumber();

    // Create batch invoice with items in a transaction
    const batchInvoice = await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.batchInvoice.create({
        data: {
          invoiceNumber,
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

    return batchInvoice;
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

    const updated = await this.prisma.batchInvoice.update({
      where: { id },
      data: { status: BatchInvoiceStatus.CANCELLED },
      include: {
        insurance: { select: { id: true, code: true, name: true, type: true } },
      },
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

  private async generateInvoiceNumber(): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const sequenceId = yearMonth;

    // Upsert sequence record and increment
    const sequence = await this.prisma.batchInvoiceSequence.upsert({
      where: { id: sequenceId },
      update: { lastValue: { increment: 1 } },
      create: { id: sequenceId, lastValue: 1 },
    });

    const seqNumber = String(sequence.lastValue).padStart(4, '0');
    return `INV-${yearMonth}-${seqNumber}`;
  }
}
