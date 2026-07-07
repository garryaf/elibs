import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BarcodeService } from './barcode.service';
import { ProcessPaymentDto } from './dto/process-payment.dto';
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
