import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TariffResolverService } from './tariff-resolver.service';
import { VisitService } from '../visit/visit.service';
import { OrderValidationGuard } from './order-validation.guard';
import { InsuranceConsolidationService } from '../../insurance/insurance-consolidation.service';
import { OrderStateMachineService } from '../lab-workflow/order-state-machine.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { AddOrderInsuranceDto, UpdateOrderInsuranceDto } from './dto/manage-order-insurance.dto';
import { CreateBpjsOrderDetailDto, UpdateBpjsOrderDetailDto, VerifyBpjsDto } from './dto/bpjs-order-detail.dto';
import { OrderStatus, BpjsVerificationStatus, PaymentMethod } from '@prisma/client';

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tariffResolver: TariffResolverService,
    private readonly visitService: VisitService,
    private readonly orderValidationGuard: OrderValidationGuard,
    private readonly consolidationService: InsuranceConsolidationService,
    private readonly orderStateMachine: OrderStateMachineService,
  ) {}

  async create(dto: CreateOrderDto, userId: string) {
    // Step 1: Centralized visit validation (always runs - visitId is required)
    await this.orderValidationGuard.validate(dto.visitId, dto.patientId);

    // Validate patient exists and not soft-deleted
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, deletedAt: null },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    // Step 2: Fetch visit to determine paymentMethod and default insurance
    const visit = await this.prisma.visit.findUnique({
      where: { id: dto.visitId },
    });

    // Determine effective insurance:
    // - Default from Visit.insuranceId
    // - Override from dto.insuranceId (must be validated against patient enrollments)
    const insuranceId = dto.insuranceId ?? visit?.insuranceId ?? null;

    // Validate override: if dto.insuranceId is provided and differs from visit's insurance
    if (insuranceId && dto.insuranceId && dto.insuranceId !== visit?.insuranceId) {
      await this.consolidationService.validateVisitInsurance(dto.patientId, insuranceId);
    }

    // For CASH visits, no insurance is required (allow no OrderInsurance records)
    const isCashVisit = visit?.paymentMethod === PaymentMethod.CASH;

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

    // Check if any tests require insurance pre-authorization
    if (insuranceId) {
      const preAuthTests = tests.filter((t) => t.requiresInsurancePreAuth);
      if (preAuthTests.length > 0) {
        // Include a warning in the response metadata (not blocking — just informational)
        // The lab workflow will enforce pre-auth before sample collection
      }
    }

    // Generate order number: LAB-YYYYMMDD-XXXX
    const orderNumber = await this.generateOrderNumber();

    // Resolve pricing via TariffResolverService
    const pricing = await this.tariffResolver.resolveOrderTotal(
      dto.testIds,
      dto.clinicId,
      insuranceId ?? undefined,
    );

    // Create order with details in a transaction
    const order = await this.prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          patientId: dto.patientId,
          clinicId: dto.clinicId ?? null,
          doctorId: dto.doctorId ?? null,
          // insuranceId: NOT written (deprecated — use OrderInsurance junction)
          visitId: dto.visitId,
          status: OrderStatus.PENDING_PAYMENT,
          totalAmount: pricing.totalAmount,
          notes: dto.notes ?? null,
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

      // Create OrderInsurance PRIMARY record within the transaction
      // Only if there's an insurance to assign (skip for CASH visits with no insurance)
      if (insuranceId && !isCashVisit) {
        await tx.orderInsurance.create({
          data: {
            orderId: createdOrder.id,
            insuranceId,
            coverageType: 'PRIMARY',
            claimStatus: 'PENDING',
          },
        });
      }

      return createdOrder;
    });

    // After order creation: transition visit to IN_PROGRESS
    await this.visitService.transitionToInProgress(dto.visitId);

    // Return order with details
    return this.prisma.order.findUnique({
      where: { id: order.id },
      include: { orderDetails: true, patient: true, visit: { select: { visitNumber: true, status: true } } },
    });
  }

  async findAll(query: OrderQueryDto, clinicId?: string) {
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    const where: any = {};

    // DataScope: restrict by clinicId for KLINIK_PARTNER users
    if (clinicId) {
      where.clinicId = clinicId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.visitId) {
      where.visitId = query.visitId;
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
        include: {
          patient: true,
          orderDetails: { include: { test: { select: { id: true, code: true, name: true, unit: true } } } },
          visit: { select: { visitNumber: true, status: true } },
          orderInsurances: true,
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    // Derive insuranceId from OrderInsurance PRIMARY for each order (backward compatibility)
    const enrichedData = data.map((order) => {
      const primaryInsurance = order.orderInsurances?.find(
        (oi) => oi.coverageType === 'PRIMARY',
      );
      return {
        ...order,
        // Override insuranceId: junction PRIMARY takes precedence, fall back to legacy FK
        insuranceId: primaryInsurance?.insuranceId ?? order.insuranceId ?? null,
      };
    });

    return {
      data: enrichedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string, clinicId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        patient: true,
        orderDetails: {
          include: { test: true },
        },
        visit: { select: { visitNumber: true, status: true } },
        orderInsurances: true,
      },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // DataScope: verify resource belongs to the user's clinic
    if (clinicId && order.clinicId !== clinicId) {
      throw new ForbiddenException('Access denied: resource belongs to another clinic');
    }

    // Derive insuranceId from OrderInsurance PRIMARY (backward compatibility)
    const primaryInsurance = order.orderInsurances?.find(
      (oi) => oi.coverageType === 'PRIMARY',
    );

    return {
      ...order,
      // Override insuranceId: junction PRIMARY takes precedence, fall back to legacy FK
      insuranceId: primaryInsurance?.insuranceId ?? order.insuranceId ?? null,
    };
  }

  async cancel(orderId: string, dto: CancelOrderDto, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT && order.status !== OrderStatus.PAYMENT_OVERDUE) {
      throw new BadRequestException({
        errorCode: 'ERR_INVALID_STATE',
        message: `Cannot transition from ${order.status} to CANCELLED`,
        errors: [
          {
            field: 'status',
            constraint: `Valid transitions from ${order.status}: ${this.orderStateMachine.getValidTransitions(order.status).join(', ')}`,
          },
        ],
      });
    }

    // Transition via state machine (handles status + cancelledAt + cancelledBy)
    await this.orderStateMachine.transition(orderId, OrderStatus.CANCELLED, {
      userId,
      reason: dto.reason,
    });

    // Return order with includes
    return this.prisma.order.findUnique({
      where: { id: orderId },
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

  // ─── Order Insurance Coverage ──────────────────────────────────────────────

  async getOrderInsurances(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const insurances = await this.prisma.orderInsurance.findMany({
      where: { orderId },
      include: {
        insurance: { select: { id: true, code: true, name: true, type: true } },
      },
      orderBy: { coverageType: 'asc' },
    });

    return { data: insurances };
  }

  async addOrderInsurance(orderId: string, dto: AddOrderInsuranceDto) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Validate insurance exists and is active
    const insurance = await this.prisma.insurance.findFirst({
      where: { id: dto.insuranceId, deletedAt: null, isActive: true },
    });
    if (!insurance) {
      throw new BadRequestException('Insurance not found or inactive');
    }

    // Check uniqueness: one coverage type per order
    const existing = await this.prisma.orderInsurance.findUnique({
      where: { orderId_coverageType: { orderId, coverageType: dto.coverageType } },
    });
    if (existing) {
      throw new BadRequestException(`Order already has ${dto.coverageType} coverage assigned`);
    }

    const orderInsurance = await this.prisma.orderInsurance.create({
      data: {
        orderId,
        insuranceId: dto.insuranceId,
        coverageType: dto.coverageType,
        claimReference: dto.claimReference,
        coveredAmount: dto.coveredAmount,
        copayAmount: dto.copayAmount,
        memberNumber: dto.memberNumber,
        notes: dto.notes,
      },
      include: {
        insurance: { select: { id: true, code: true, name: true, type: true } },
      },
    });

    return orderInsurance;
  }

  async updateOrderInsurance(orderInsuranceId: string, dto: UpdateOrderInsuranceDto) {
    const existing = await this.prisma.orderInsurance.findUnique({
      where: { id: orderInsuranceId },
    });
    if (!existing) {
      throw new NotFoundException('Order insurance record not found');
    }

    const data: any = { ...dto };
    if (dto.submittedAt) data.submittedAt = new Date(dto.submittedAt);
    if (dto.approvedAt) data.approvedAt = new Date(dto.approvedAt);
    if (dto.rejectedAt) data.rejectedAt = new Date(dto.rejectedAt);
    if (dto.paidAt) data.paidAt = new Date(dto.paidAt);

    const updated = await this.prisma.orderInsurance.update({
      where: { id: orderInsuranceId },
      data,
      include: {
        insurance: { select: { id: true, code: true, name: true, type: true } },
      },
    });

    return updated;
  }

  async removeOrderInsurance(orderInsuranceId: string) {
    const existing = await this.prisma.orderInsurance.findUnique({
      where: { id: orderInsuranceId },
    });
    if (!existing) {
      throw new NotFoundException('Order insurance record not found');
    }

    await this.prisma.orderInsurance.delete({
      where: { id: orderInsuranceId },
    });

    return { success: true, message: 'Order insurance coverage removed' };
  }

  // ─── BPJS Order Detail ─────────────────────────────────────────────────────

  async getBpjsDetail(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const bpjsDetail = await this.prisma.bpjsOrderDetail.findUnique({
      where: { orderId },
    });

    return { data: bpjsDetail };
  }

  async createBpjsDetail(orderId: string, dto: CreateBpjsOrderDetailDto) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check if BPJS detail already exists for this order
    const existing = await this.prisma.bpjsOrderDetail.findUnique({
      where: { orderId },
    });
    if (existing) {
      throw new BadRequestException('BPJS detail already exists for this order');
    }

    // Validate SEP number format if provided
    if (dto.sepNumber && !/^\d{1,19}$/.test(dto.sepNumber)) {
      throw new BadRequestException('SEP number must be numeric and max 19 digits');
    }

    const bpjsDetail = await this.prisma.bpjsOrderDetail.create({
      data: {
        orderId,
        sepNumber: dto.sepNumber,
        referringFacilityCode: dto.referringFacilityCode,
        referringFacilityName: dto.referringFacilityName,
        classLevel: dto.classLevel,
        diagnosisCode: dto.diagnosisCode,
        diagnosisName: dto.diagnosisName,
        procedureCode: dto.procedureCode,
        guaranteeLetterNo: dto.guaranteeLetterNo,
        notes: dto.notes,
      },
    });

    return bpjsDetail;
  }

  async updateBpjsDetail(orderId: string, dto: UpdateBpjsOrderDetailDto) {
    const existing = await this.prisma.bpjsOrderDetail.findUnique({
      where: { orderId },
    });
    if (!existing) {
      throw new NotFoundException('BPJS detail not found for this order');
    }

    // Validate SEP number format if provided
    if (dto.sepNumber && !/^\d{1,19}$/.test(dto.sepNumber)) {
      throw new BadRequestException('SEP number must be numeric and max 19 digits');
    }

    const data: any = { ...dto };

    // If verifying, set verifiedAt
    if (dto.verificationStatus === BpjsVerificationStatus.VERIFIED) {
      data.verifiedAt = new Date();
    }

    const updated = await this.prisma.bpjsOrderDetail.update({
      where: { orderId },
      data,
    });

    return updated;
  }

  async verifyBpjs(orderId: string, dto: VerifyBpjsDto, userId: string) {
    const existing = await this.prisma.bpjsOrderDetail.findUnique({
      where: { orderId },
    });
    if (!existing) {
      throw new NotFoundException('BPJS detail not found for this order');
    }

    // Validate SEP format
    if (!/^\d{1,19}$/.test(dto.sepNumber)) {
      throw new BadRequestException('SEP number must be numeric and max 19 digits');
    }

    // In production, this would call BPJS API for verification
    // For now, we just update the status to VERIFIED
    const updated = await this.prisma.bpjsOrderDetail.update({
      where: { orderId },
      data: {
        sepNumber: dto.sepNumber,
        referringFacilityCode: dto.referringFacilityCode ?? existing.referringFacilityCode,
        classLevel: dto.classLevel ?? existing.classLevel,
        verificationStatus: BpjsVerificationStatus.VERIFIED,
        verifiedAt: new Date(),
        verifiedBy: userId,
      },
    });

    return { success: true, message: 'BPJS verification successful', data: updated };
  }
}
