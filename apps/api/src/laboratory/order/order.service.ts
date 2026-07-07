import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TariffResolverService } from './tariff-resolver.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tariffResolver: TariffResolverService,
  ) {}

  async create(dto: CreateOrderDto, userId: string) {
    // Validate patient exists and not soft-deleted
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, deletedAt: null },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    // Validate all testIds exist and are active (not deleted)
    const tests = await this.prisma.testMaster.findMany({
      where: { id: { in: dto.testIds }, deletedAt: null, isActive: true },
    });
    if (tests.length !== dto.testIds.length) {
      const foundIds = tests.map((t) => t.id);
      const missingIds = dto.testIds.filter((id) => !foundIds.includes(id));
      throw new BadRequestException({
        errorCode: 'ERR_VALIDATION',
        message: `Tests not found or inactive: ${missingIds.join(', ')}`,
      });
    }

    // Generate order number: LAB-YYYYMMDD-XXXX
    const orderNumber = await this.generateOrderNumber();

    // Resolve pricing via TariffResolverService
    const pricing = await this.tariffResolver.resolveOrderTotal(
      dto.testIds,
      dto.clinicId,
      dto.insuranceId,
    );

    // Create order with details in a transaction
    const order = await this.prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          patientId: dto.patientId,
          clinicId: dto.clinicId ?? null,
          doctorId: dto.doctorId ?? null,
          insuranceId: dto.insuranceId ?? null,
          status: OrderStatus.PENDING_PAYMENT,
          totalAmount: pricing.totalAmount,
        },
      });

      // Create OrderDetail records per testId
      const orderDetailsData = pricing.items.map((item) => ({
        orderId: createdOrder.id,
        testId: item.testId,
        status: 'PENDING' as const,
        price: item.tariff.basePrice,
        discount: item.tariff.discount,
        finalPrice: item.tariff.finalPrice,
      }));

      await tx.orderDetail.createMany({ data: orderDetailsData });

      return createdOrder;
    });

    // Return order with details
    return this.prisma.order.findUnique({
      where: { id: order.id },
      include: { orderDetails: true, patient: true },
    });
  }

  async findAll(query: OrderQueryDto) {
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: { patient: true, orderDetails: true },
      }),
      this.prisma.order.count({ where }),
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

  async findById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        patient: true,
        orderDetails: {
          include: { test: true },
        },
      },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  async cancel(orderId: string, dto: CancelOrderDto, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException({
        errorCode: 'ERR_INVALID_STATE',
        message: `Order cannot be cancelled in status ${order.status}. Only orders in PENDING_PAYMENT status can be cancelled.`,
      });
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CANCELLED,
        cancelReason: dto.reason,
        cancelledBy: userId,
        cancelledAt: new Date(),
      },
      include: { patient: true, orderDetails: true },
    });
  }

  private async generateOrderNumber(): Promise<string> {
    const today = new Date();
    const yyyy = today.getFullYear().toString();
    const mm = (today.getMonth() + 1).toString().padStart(2, '0');
    const dd = today.getDate().toString().padStart(2, '0');
    const dateStr = `${yyyy}${mm}${dd}`;

    // Count today's orders to determine the next sequential number
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const todayCount = await this.prisma.order.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    });

    const sequence = (todayCount + 1).toString().padStart(4, '0');
    return `LAB-${dateStr}-${sequence}`;
  }
}
