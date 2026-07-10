import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { OrderStatus, SampleCondition } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OrderStateMachineService } from './order-state-machine.service';
import { AutoFlaggingService } from './auto-flagging.service';
import { ConfirmSampleDto } from './dto/confirm-sample.dto';
import { EnterResultsDto } from './dto/enter-results.dto';
import { VerifyResultsDto } from './dto/verify-results.dto';
import { ApproveOrderDto } from './dto/approve-order.dto';

@Injectable()
export class LabWorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderStateMachine: OrderStateMachineService,
    private readonly autoFlaggingService: AutoFlaggingService,
  ) {}

  async confirmSample(orderId: string, dto: ConfirmSampleDto, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { patient: true, orderDetails: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!order.visitId) {
      throw new BadRequestException({
        errorCode: 'ERR_VALIDATION',
        message: `Order ${orderId} has no visit linkage. Traceability chain broken: Visit → Order required.`,
      });
    }

    if (order.status !== OrderStatus.PAID) {
      throw new BadRequestException(
        'Order must be in PAID status for sample collection',
      );
    }

    // Check insurance pre-authorization requirement
    if (order.insuranceId) {
      const testsRequiringPreAuth = await this.prisma.orderDetail.findMany({
        where: { orderId, test: { requiresInsurancePreAuth: true } },
        include: { test: { select: { id: true, name: true, code: true } } },
      });

      if (testsRequiringPreAuth.length > 0) {
        // Check if BPJS detail exists and is verified
        const bpjsDetail = await this.prisma.bpjsOrderDetail.findUnique({
          where: { orderId },
        });
        const isVerified = bpjsDetail?.verificationStatus === 'VERIFIED';

        // Check if any OrderInsurance claim is at least submitted
        const orderInsurance = await this.prisma.orderInsurance.findFirst({
          where: { orderId },
        });
        const hasClaimApproval = orderInsurance &&
          ['APPROVED', 'PARTIALLY_APPROVED', 'SUBMITTED', 'UNDER_REVIEW'].includes(orderInsurance.claimStatus);

        if (!isVerified && !hasClaimApproval) {
          const testNames = testsRequiringPreAuth.map((od) => od.test.name).join(', ');
          throw new BadRequestException({
            errorCode: 'ERR_PRE_AUTH_REQUIRED',
            message: `Pemeriksaan berikut memerlukan pre-otorisasi asuransi sebelum pengambilan sampel: ${testNames}. Pastikan verifikasi BPJS/asuransi telah dilakukan.`,
          });
        }
      }
    }

    if (!order.barcode || !order.barcodeImage) {
      throw new BadRequestException(
        'Order must have a valid barcode before sample collection',
      );
    }

    if (dto.sampleCondition === SampleCondition.ACCEPTABLE) {
      const updatedOrder = await this.orderStateMachine.transition(
        orderId,
        OrderStatus.SAMPLE_COLLECTED,
        { userId },
      );

      await this.prisma.order.update({
        where: { id: orderId },
        data: { sampleCondition: dto.sampleCondition },
      });

      return {
        ...updatedOrder,
        sampleCondition: dto.sampleCondition,
      };
    }

    // Sample condition is not acceptable - keep PAID status, record rejection
    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        sampleCondition: dto.sampleCondition,
        rejectionReason: dto.rejectionReason ?? null,
      },
      include: { patient: true, orderDetails: true },
    });

    return updatedOrder;
  }

  async enterResults(orderId: string, dto: EnterResultsDto, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { patient: true, orderDetails: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!order.visitId) {
      throw new BadRequestException({
        errorCode: 'ERR_VALIDATION',
        message: `Order ${orderId} has no visit linkage. Traceability chain broken: Visit → Order required.`,
      });
    }

    if (
      order.status !== OrderStatus.SAMPLE_COLLECTED &&
      order.status !== OrderStatus.IN_ANALYSIS
    ) {
      throw new BadRequestException(
        'Order must be in SAMPLE_COLLECTED or IN_ANALYSIS status for result entry',
      );
    }

    const now = new Date();
    const patientAge = this.calculateAge(order.patient.dateOfBirth);
    const patientGender = order.patient.gender;

    for (const entry of dto.results) {
      const orderDetail = order.orderDetails.find(
        (od) => od.id === entry.orderDetailId,
      );

      if (!orderDetail) {
        throw new BadRequestException(
          `OrderDetail ${entry.orderDetailId} not found or does not belong to this order`,
        );
      }

      let flag = null;
      const numericValue = parseFloat(entry.resultValue);

      if (!isNaN(numericValue)) {
        flag = await this.autoFlaggingService.calculateFlag(
          numericValue,
          orderDetail.testId,
          patientAge,
          patientGender,
        );
      }

      await this.prisma.orderDetail.update({
        where: { id: entry.orderDetailId },
        data: {
          resultValue: entry.resultValue,
          flag,
          resultEnteredAt: now,
          resultEnteredBy: userId,
          status: 'RESULT_ENTERED',
          comment: entry.comment ?? null,
        },
      });
    }

    // Check if ALL OrderDetails now have resultValue
    const updatedOrderDetails = await this.prisma.orderDetail.findMany({
      where: { orderId },
    });

    const allHaveResults = updatedOrderDetails.every(
      (od) => od.resultValue !== null,
    );

    // If all have results and order is SAMPLE_COLLECTED → transition to IN_ANALYSIS
    if (allHaveResults && order.status === OrderStatus.SAMPLE_COLLECTED) {
      await this.orderStateMachine.transition(
        orderId,
        OrderStatus.IN_ANALYSIS,
        { userId },
      );
    }

    // Return updated order
    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        patient: true,
        orderDetails: { include: { test: true } },
      },
    });
  }

  async verifyResults(orderId: string, dto: VerifyResultsDto, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { orderDetails: { include: { test: true } } },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!order.visitId) {
      throw new BadRequestException({
        errorCode: 'ERR_VALIDATION',
        message: `Order ${orderId} has no visit linkage. Traceability chain broken: Visit → Order required.`,
      });
    }

    if (order.status !== OrderStatus.IN_ANALYSIS) {
      throw new BadRequestException(
        'Order must be in IN_ANALYSIS status for verification',
      );
    }

    const allHaveResults = order.orderDetails.every(
      (od) => od.resultValue !== null,
    );

    if (!allHaveResults) {
      throw new BadRequestException(
        'All results must be entered before verification',
      );
    }

    const updatedOrder = await this.orderStateMachine.transition(
      orderId,
      OrderStatus.VERIFIED,
      { userId, reason: dto.verificationNotes },
    );

    // Auto-approve if all tests do not require doctor approval
    const autoApproved = await this.autoApproveIfEligible(orderId, userId);
    if (autoApproved) {
      return this.prisma.order.findUnique({
        where: { id: orderId },
        include: { patient: true, orderDetails: true },
      });
    }

    return updatedOrder;
  }

  async approveOrder(orderId: string, dto: ApproveOrderDto, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { orderDetails: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!order.visitId) {
      throw new BadRequestException({
        errorCode: 'ERR_VALIDATION',
        message: `Order ${orderId} has no visit linkage. Traceability chain broken: Visit → Order required.`,
      });
    }

    if (order.status !== OrderStatus.VERIFIED) {
      throw new BadRequestException(
        'Order must be in VERIFIED status for approval',
      );
    }

    if (dto.decision === 'APPROVE') {
      const updatedOrder = await this.orderStateMachine.transition(
        orderId,
        OrderStatus.APPROVED,
        {
          userId,
          metadata: { interpretation: dto.interpretation },
        },
      );

      return updatedOrder;
    }

    // REJECT: transition back to IN_ANALYSIS
    const updatedOrder = await this.orderStateMachine.transition(
      orderId,
      OrderStatus.IN_ANALYSIS,
      { userId, reason: dto.rejectionReason },
    );

    // Record the rejection reason on the order
    await this.prisma.order.update({
      where: { id: orderId },
      data: { rejectedReason: dto.rejectionReason },
    });

    return {
      ...updatedOrder,
      rejectedReason: dto.rejectionReason,
    };
  }

  async getApprovalQueue(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const where = {
      status: OrderStatus.VERIFIED,
    };

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: true,
          orderDetails: {
            include: { test: true },
          },
        },
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

  async autoApproveIfEligible(orderId: string, userId: string): Promise<boolean> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { orderDetails: { include: { test: true } } },
    });

    if (!order || order.status !== OrderStatus.VERIFIED) {
      return false;
    }

    const allSkipApproval = order.orderDetails.every(
      (od) => od.test.requiresDoctorApproval === false,
    );

    if (!allSkipApproval) {
      return false;
    }

    await this.orderStateMachine.transition(
      orderId,
      OrderStatus.APPROVED,
      { userId, metadata: { interpretation: 'Auto-approved: no tests require doctor approval' } },
    );

    return true;
  }

  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())
    ) {
      age--;
    }
    return age;
  }

  async getQueue(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const where = {
      status: {
        in: [OrderStatus.PAID, OrderStatus.SAMPLE_COLLECTED],
      },
    };

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: true,
          orderDetails: {
            include: { test: true },
          },
        },
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

  async getDeltaCheck(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { orderDetails: { include: { test: true } } },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const results = [];

    for (const detail of order.orderDetails) {
      const history = await this.prisma.orderDetail.findMany({
        where: {
          testId: detail.testId,
          resultValue: { not: null },
          order: {
            patientId: order.patientId,
            id: { not: orderId },
          },
        },
        take: 5,
        orderBy: { resultEnteredAt: 'desc' },
        include: { order: { select: { orderNumber: true } } },
      });

      results.push({
        testId: detail.testId,
        testName: detail.test.name,
        history: history.map((h) => ({
          resultValue: h.resultValue,
          flag: h.flag,
          resultDate: h.resultEnteredAt,
          orderNumber: h.order.orderNumber,
        })),
      });
    }

    return results;
  }
}
