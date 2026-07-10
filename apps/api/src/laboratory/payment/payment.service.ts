import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BarcodeService } from './barcode.service';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { SplitPaymentDto } from './dto/split-payment.dto';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly barcodeService: BarcodeService,
  ) {}

  async processPayment(orderId: string, dto: ProcessPaymentDto, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException({
        errorCode: 'ERR_INVALID_STATE',
        message: `Order is in ${order.status} status, expected PENDING_PAYMENT`,
      });
    }

    // Generate barcode
    const barcode = await this.barcodeService.generate(orderId, order.orderNumber);

    // Update order with payment info and barcode
    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.PAID,
        paymentMethod: dto.paymentMethod,
        amountPaid: dto.amountPaid,
        paidAt: new Date(),
        barcode: barcode.barcodeData,
        barcodeImage: barcode.barcodeImage,
      },
      include: {
        patient: true,
        orderDetails: true,
      },
    });

    return updatedOrder;
  }

  async processSplitPayment(orderId: string, dto: SplitPaymentDto, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException({
        errorCode: 'ERR_INVALID_STATE',
        message: `Order is in ${order.status} status, expected PENDING_PAYMENT`,
      });
    }

    // Validate sum of component amounts equals order totalAmount
    const componentSum = dto.components.reduce(
      (sum, component) => sum.plus(new Decimal(component.amount)),
      new Decimal(0),
    );

    if (!componentSum.equals(order.totalAmount)) {
      throw new BadRequestException({
        errorCode: 'ERR_AMOUNT_MISMATCH',
        message: `Sum of payment components (${componentSum.toString()}) does not equal order total (${order.totalAmount.toString()})`,
      });
    }

    // Generate barcode
    const barcode = await this.barcodeService.generate(orderId, order.orderNumber);

    // Create payment components and update order in a transaction
    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      // Create PaymentComponent records
      await tx.paymentComponent.createMany({
        data: dto.components.map((component) => ({
          orderId,
          paymentMethod: component.paymentMethod,
          amount: component.amount,
          insuranceId: component.insuranceId || null,
          reference: component.reference || null,
          notes: component.notes || null,
        })),
      });

      // Update order status to PAID
      return tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.PAID,
          amountPaid: order.totalAmount,
          paidAt: new Date(),
          barcode: barcode.barcodeData,
          barcodeImage: barcode.barcodeImage,
        },
        include: {
          patient: true,
          orderDetails: true,
          paymentComponents: true,
        },
      });
    });

    return updatedOrder;
  }

  async getPaymentComponents(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const components = await this.prisma.paymentComponent.findMany({
      where: { orderId },
      include: { insurance: { select: { id: true, name: true, code: true, type: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return components;
  }

  async getBarcode(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNumber: true, barcodeImage: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!order.barcodeImage) {
      throw new NotFoundException('Barcode not generated yet. Payment must be processed first.');
    }

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      barcodeImage: order.barcodeImage,
    };
  }

  async getInvoice(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
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
}
