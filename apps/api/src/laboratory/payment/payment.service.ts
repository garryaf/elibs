import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BarcodeService } from '../../common/barcode';
import { AuditService } from '../audit/audit.service';
import { OrderStateMachineService } from '../lab-workflow/order-state-machine.service';
import { DiscountApprovalService } from '../../approval/discount-approval.service';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { SplitPaymentDto } from './dto/split-payment.dto';
import { DepositPaymentDto } from './dto/deposit-payment.dto';
import { OrderStatus, PaymentMethod } from '@prisma/client';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly barcodeService: BarcodeService,
    private readonly auditService: AuditService,
    private readonly orderStateMachine: OrderStateMachineService,
    private readonly discountApprovalService: DiscountApprovalService,
  ) {}

  async processPayment(orderId: string, dto: ProcessPaymentDto, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (
      order.status !== OrderStatus.PENDING_PAYMENT &&
      order.status !== OrderStatus.PAYMENT_OVERDUE &&
      order.status !== OrderStatus.DEPOSIT_RECEIVED
    ) {
      throw new BadRequestException({
        errorCode: 'ERR_INVALID_STATE',
        message: `Cannot transition from ${order.status} to PAID`,
        errors: [
          {
            field: 'status',
            constraint: `Valid transitions from ${order.status}: ${this.orderStateMachine.getValidTransitions(order.status).join(', ')}`,
          },
        ],
      });
    }

    // Discount validation — Requirement 9.2: Require approved ApprovalRequest
    // with requestType=DISCOUNT before applying discount
    let finalPayable = order.totalAmount;
    if (dto.discountAmount !== undefined && dto.discountAmount !== null) {
      const discount = new Decimal(dto.discountAmount);
      if (discount.lte(0)) {
        throw new BadRequestException('Discount amount must be greater than zero');
      }
      if (discount.gt(order.totalAmount)) {
        throw new BadRequestException('Discount amount cannot exceed total order amount');
      }

      // Verify an approved DISCOUNT ApprovalRequest exists for this order
      const hasApproval = await this.discountApprovalService.hasApprovedDiscountRequest(orderId);
      if (!hasApproval) {
        throw new BadRequestException({
          errorCode: 'ERR_DISCOUNT_NOT_APPROVED',
          message: 'A discount cannot be applied without an approved DISCOUNT approval request. Please submit a discount approval request first.',
        });
      }

      finalPayable = order.totalAmount.minus(discount);
    }

    // Payment validation: amountPaid must be >= totalAmount (after discount)
    const amountPaid = new Decimal(dto.amountPaid);
    if (amountPaid.lt(finalPayable)) {
      throw new BadRequestException({
        errorCode: 'ERR_UNDERPAYMENT',
        message: `Amount paid (${amountPaid.toString()}) is less than required amount (${finalPayable.toString()}). Under-payments are not accepted.`,
      });
    }

    // Calculate change for cash overpayments
    let change: Decimal | null = null;
    if (dto.paymentMethod === PaymentMethod.CASH && amountPaid.gt(finalPayable)) {
      change = amountPaid.minus(finalPayable);
    }

    // Generate barcode
    const barcode = await this.barcodeService.generate(orderId, order.orderNumber);

    // Transition via state machine (handles status + paidAt timestamp)
    await this.orderStateMachine.transition(orderId, OrderStatus.PAID, { userId });

    // Update payment-specific fields separately
    // Store barcodeText for on-demand regeneration (Requirement 18.1)
    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        paymentMethod: dto.paymentMethod,
        amountPaid: finalPayable,
        discountAmount: dto.discountAmount ? new Decimal(dto.discountAmount) : null,
        discountReason: dto.discountReason || null,
        barcode: barcode.barcodeData,
        barcodeImage: barcode.barcodeImage,
        barcodeText: order.orderNumber,
      },
      include: {
        patient: true,
        orderDetails: true,
      },
    });

    // Audit log discount application
    if (dto.discountAmount) {
      await this.auditService.log(
        userId,
        'APPLY_DISCOUNT',
        'Order',
        orderId,
        null,
        { discountAmount: dto.discountAmount, discountReason: dto.discountReason },
        null,
      );
    }

    return {
      ...updatedOrder,
      change: change ? change.toNumber() : 0,
    };
  }

  async processSplitPayment(orderId: string, dto: SplitPaymentDto, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT && order.status !== OrderStatus.PAYMENT_OVERDUE) {
      throw new BadRequestException({
        errorCode: 'ERR_INVALID_STATE',
        message: `Cannot transition from ${order.status} to PAID`,
        errors: [
          {
            field: 'status',
            constraint: `Valid transitions from ${order.status}: ${this.orderStateMachine.getValidTransitions(order.status).join(', ')}`,
          },
        ],
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

    // Transition via state machine (handles status + paidAt timestamp)
    await this.orderStateMachine.transition(orderId, OrderStatus.PAID, { userId });

    // Create payment components and update payment-specific fields in a transaction
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

      // Update payment-specific fields (status already transitioned by state machine)
      // Store barcodeText for on-demand regeneration (Requirement 18.1)
      return tx.order.update({
        where: { id: orderId },
        data: {
          amountPaid: order.totalAmount,
          barcode: barcode.barcodeData,
          barcodeImage: barcode.barcodeImage,
          barcodeText: order.orderNumber,
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
      select: { id: true, orderNumber: true, barcodeImage: true, barcodeText: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // On-demand regeneration (Requirement 18.1): if barcodeText is available,
    // generate the image on-demand rather than requiring stored barcodeImage
    if (!order.barcodeImage && !order.barcodeText) {
      throw new NotFoundException('Barcode not generated yet. Payment must be processed first.');
    }

    // If barcodeImage is stored, return it; otherwise generate on-demand from barcodeText
    const barcodeImage = order.barcodeImage
      ?? await this.barcodeService.generateImage(order.barcodeText!);

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      barcodeImage,
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

  async processDeposit(orderId: string, dto: DepositPaymentDto, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (
      order.status !== OrderStatus.PENDING_PAYMENT &&
      order.status !== OrderStatus.PAYMENT_OVERDUE
    ) {
      throw new BadRequestException({
        errorCode: 'ERR_INVALID_STATE',
        message: `Cannot accept deposit for order in status ${order.status}. Order must be in PENDING_PAYMENT or PAYMENT_OVERDUE status.`,
      });
    }

    const depositAmount = new Decimal(dto.depositAmount);

    // Validate deposit does not exceed total amount
    if (depositAmount.gt(order.totalAmount)) {
      throw new BadRequestException({
        errorCode: 'ERR_DEPOSIT_OVERFLOW',
        message: `Deposit amount (${depositAmount.toString()}) exceeds order total (${order.totalAmount.toString()}).`,
      });
    }

    // Transition to DEPOSIT_RECEIVED (does NOT trigger PAID)
    await this.orderStateMachine.transition(orderId, OrderStatus.DEPOSIT_RECEIVED, { userId });

    // Update deposit-specific fields
    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        depositAmount,
        paymentMethod: dto.paymentMethod,
        notes: dto.notes || null,
      },
      include: {
        patient: true,
        orderDetails: true,
      },
    });

    // Audit log
    await this.auditService.log(
      userId,
      'DEPOSIT_RECEIVED',
      'Order',
      orderId,
      null,
      { depositAmount: dto.depositAmount, paymentMethod: dto.paymentMethod },
      null,
    );

    return updatedOrder;
  }
}
