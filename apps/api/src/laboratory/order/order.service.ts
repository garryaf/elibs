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
import { OrderSequenceService } from './order-sequence.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { AddOrderInsuranceDto, UpdateOrderInsuranceDto } from './dto/manage-order-insurance.dto';
import { CreateBpjsOrderDetailDto, UpdateBpjsOrderDetailDto, VerifyBpjsDto } from './dto/bpjs-order-detail.dto';
import { BpjsApiService } from './bpjs-api.service';
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
    private readonly orderSequenceService: OrderSequenceService,
    private readonly bpjsApiService: BpjsApiService,
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

    // Step 2.5: Expand panelIds into constituent testIds via PanelTest junction
    let resolvedTestIds = [...(dto.testIds ?? [])];

    if (dto.panelIds && dto.panelIds.length > 0) {
      // Validate panels exist and are active
      const panels = await this.prisma.panel.findMany({
        where: { id: { in: dto.panelIds }, deletedAt: null, isActive: true },
      });
      if (panels.length !== dto.panelIds.length) {
        const foundPanelIds = panels.map((p) => p.id);
        const missingPanelIds = dto.panelIds.filter((id) => !foundPanelIds.includes(id));
        throw new BadRequestException({
          errorCode: 'ERR_VALIDATION',
          message: `Panels not found or inactive: ${missingPanelIds.join(', ')}`,
        });
      }

      // Expand panels into constituent tests via PanelTest junction
      const panelTests = await this.prisma.panelTest.findMany({
        where: { panelId: { in: dto.panelIds } },
        select: { testId: true },
      });

      const panelTestIds = panelTests.map((pt) => pt.testId);
      resolvedTestIds = [...resolvedTestIds, ...panelTestIds];
    }

    // Step 2.6: Auto-expand individual tests that are actually panels.
    // If a test (e.g. HEM-005 "Darah Lengkap (CBC)") is ordered directly via testIds,
    // but a Panel with matching constituent tests exists, replace the "umbrella" test
    // with its individual component tests for proper result entry.
    if (resolvedTestIds.length > 0) {
      // Find panels whose names match tests being ordered (via PanelTest junction)
      // Strategy: look for any test that has unit '-' and also has a panel linking to other tests
      const panelTestLinks = await this.prisma.panelTest.findMany({
        where: { testId: { in: resolvedTestIds } },
        select: { testId: true, panelId: true },
      });

      if (panelTestLinks.length > 0) {
        // These testIds are themselves "constituents" of a panel — don't expand them.
        // We only want to expand tests that ACT as a panel header.
      }

      // Find tests that are referenced as the basis for a panel (same name matching)
      const testsBeingOrdered = await this.prisma.testMaster.findMany({
        where: { id: { in: resolvedTestIds }, deletedAt: null },
        select: { id: true, name: true, unit: true },
      });

      // For each test with unit '-' (meta/umbrella test), check if a panel with matching name exists
      const umbrellaTests = testsBeingOrdered.filter((t) => t.unit === '-');
      const expandedFromUmbrella: string[] = [];
      const umbrellaIdsToRemove: string[] = [];

      for (const umbrella of umbrellaTests) {
        const matchingPanel = await this.prisma.panel.findFirst({
          where: {
            name: { equals: umbrella.name, mode: 'insensitive' },
            deletedAt: null,
            isActive: true,
          },
          include: { panelTests: { select: { testId: true } } },
        });

        if (matchingPanel && matchingPanel.panelTests.length > 0) {
          // Replace umbrella test with its constituent tests
          umbrellaIdsToRemove.push(umbrella.id);
          for (const pt of matchingPanel.panelTests) {
            expandedFromUmbrella.push(pt.testId);
          }
        }
      }

      if (umbrellaIdsToRemove.length > 0) {
        resolvedTestIds = resolvedTestIds.filter((id) => !umbrellaIdsToRemove.includes(id));
        resolvedTestIds = [...resolvedTestIds, ...expandedFromUmbrella];
      }
    }

    // Deduplicate testIds
    resolvedTestIds = [...new Set(resolvedTestIds)];

    // Ensure at least one test is present after expansion
    if (resolvedTestIds.length === 0) {
      throw new BadRequestException({
        errorCode: 'ERR_VALIDATION',
        message: 'Order must contain at least one test. Provide testIds or panelIds with constituent tests.',
      });
    }

    // Validate all testIds exist and are active (not deleted)
    const tests = await this.prisma.testMaster.findMany({
      where: { id: { in: resolvedTestIds }, deletedAt: null, isActive: true },
    });
    if (tests.length !== resolvedTestIds.length) {
      const foundIds = tests.map((t) => t.id);
      const missingIds = resolvedTestIds.filter((id) => !foundIds.includes(id));
      throw new BadRequestException({
        errorCode: 'ERR_VALIDATION',
        message: `Tests not found or inactive: ${missingIds.join(', ')}`,
      });
    }

    // Check if any tests require insurance pre-authorization
    const preAuthWarnings: string[] = [];
    if (insuranceId) {
      const preAuthTests = tests.filter((t) => t.requiresInsurancePreAuth);
      if (preAuthTests.length > 0) {
        // Include a warning in the response metadata (not blocking — just informational)
        // The lab workflow will enforce pre-auth before sample collection
        preAuthWarnings.push(
          ...preAuthTests.map((t) => `Pre-authorization required for test: ${t.name}`)
        );
      }
    }

    // Generate order number via dedicated OrderSequenceService (SERIALIZABLE isolation)
    const orderNumber = await this.orderSequenceService.generateOrderNumber();

    // Resolve pricing via TariffResolverService
    const pricing = await this.tariffResolver.resolveOrderTotal(
      resolvedTestIds,
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
          priority: dto.priority ?? undefined,
          totalAmount: pricing.totalAmount,
          notes: dto.notes ?? null,
          barcodeText: orderNumber, // Store deterministic text for on-demand barcode regeneration (Req 18.1)
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
    const resultOrder = await this.prisma.order.findUnique({
      where: { id: order.id },
      include: { orderDetails: true, patient: true, visit: { select: { visitNumber: true, status: true } } },
    });

    return {
      ...resultOrder,
      preAuthWarnings,
    };
  }

  /**
   * Preview pricing for a list of tests without creating an order.
   * Returns price, discount, final price, and resolution source per test.
   */
  async previewPricing(testIds: string[], clinicId?: string, insuranceId?: string) {
    if (!testIds || testIds.length === 0) {
      return { items: [], subtotal: 0, totalDiscount: 0, totalAmount: 0 };
    }

    const pricing = await this.tariffResolver.resolveOrderTotal(testIds, clinicId, insuranceId);

    // Enrich with test names
    const tests = await this.prisma.testMaster.findMany({
      where: { id: { in: testIds }, deletedAt: null },
      select: { id: true, code: true, name: true, price: true },
    });
    const testMap = new Map(tests.map((t) => [t.id, t]));

    const items = pricing.items.map((item) => {
      const test = testMap.get(item.testId);
      return {
        testId: item.testId,
        testCode: test?.code ?? '',
        testName: test?.name ?? '',
        basePrice: item.tariff.basePrice,
        discount: item.tariff.discount,
        finalPrice: item.tariff.finalPrice,
        resolution: item.tariff.resolution,
        tariffId: item.tariff.tariffId,
      };
    });

    return {
      items,
      subtotal: pricing.subtotal,
      totalDiscount: pricing.totalDiscount,
      totalAmount: pricing.totalAmount,
    };
  }

  async findAll(query: OrderQueryDto, clinicId?: string) {
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    const where: any = {
      patient: { deletedAt: null },
    };

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

    if (query.search) {
      where.AND = [
        { patient: { deletedAt: null } },
        {
          OR: [
            { orderNumber: { contains: query.search, mode: 'insensitive' } },
            { patient: { name: { contains: query.search, mode: 'insensitive' } } },
            { patient: { mrn: { contains: query.search, mode: 'insensitive' } } },
          ],
        },
      ];
      // Remove top-level patient filter to avoid conflict with AND patient conditions
      delete where.patient;
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

  async getStats(clinicId?: string) {
    const where: any = {
      patient: { deletedAt: null },
    };

    if (clinicId) {
      where.clinicId = clinicId;
    }

    // Get today's date boundaries in UTC
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Statuses that indicate payment has been received
    const paidStatuses: OrderStatus[] = [
      OrderStatus.PAID,
      OrderStatus.SAMPLE_COLLECTED,
      OrderStatus.IN_ANALYSIS,
      OrderStatus.VERIFIED,
      OrderStatus.APPROVED,
      OrderStatus.NOTIFIED,
    ];

    const [
      totalOrders,
      pendingPayment,
      completed,
      todayPaidOrders,
    ] = await Promise.all([
      // Total orders (excluding cancelled, soft-deleted patients)
      this.prisma.order.count({ where }),
      // Pending payment
      this.prisma.order.count({
        where: { ...where, status: OrderStatus.PENDING_PAYMENT },
      }),
      // Completed (approved + notified)
      this.prisma.order.count({
        where: { ...where, status: { in: [OrderStatus.APPROVED, OrderStatus.NOTIFIED] } },
      }),
      // Today's revenue: orders paid today
      this.prisma.order.findMany({
        where: {
          ...where,
          status: { in: paidStatuses },
          paidAt: { gte: todayStart, lte: todayEnd },
        },
        select: { totalAmount: true },
      }),
    ]);

    const todayRevenue = todayPaidOrders.reduce(
      (sum, o) => sum + (o.totalAmount ? Number(o.totalAmount) : 0),
      0,
    );

    return {
      totalOrders,
      pendingPayment,
      completed,
      todayRevenue,
    };
  }

  async findById(id: string, clinicId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        patient: true,
        clinic: { select: { id: true, name: true, address: true, phone: true } },
        doctor: { select: { id: true, name: true, specialization: true } },
        orderDetails: {
          include: {
            test: {
              include: {
                referenceValues: true,
              },
            },
          },
        },
        visit: {
          select: {
            visitNumber: true,
            status: true,
            doctor: { select: { id: true, name: true } },
          },
        },
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

    // Resolve approvedBy UUID to a name (lookup in users table)
    let approvedByName: string | null = null;
    if (order.approvedBy) {
      const approver = await this.prisma.user.findUnique({
        where: { id: order.approvedBy },
        select: { name: true },
      });
      approvedByName = approver?.name ?? null;
    }

    return {
      ...order,
      // Override insuranceId: junction PRIMARY takes precedence, fall back to legacy FK
      insuranceId: primaryInsurance?.insuranceId ?? order.insuranceId ?? null,
      // Resolved approver name for report display
      approvedByName,
    };
  }

  /**
   * Retrieve the barcodeText (or orderNumber) for on-demand barcode image generation.
   * Returns null if the order does not exist.
   */
  async findBarcodeText(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      select: { id: true, orderNumber: true, barcodeText: true },
    });
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

    // Evaluate if the visit should be marked as COMPLETED after this cancellation
    if (order.visitId) {
      await this.visitService.evaluateCompletion(order.visitId).catch(() => {
        // Non-blocking: don't fail cancellation if visit evaluation fails
      });
    }

    // Return order with includes
    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: { patient: true, orderDetails: true },
    });
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

    // Look up the visit's BPJS number for eligibility check
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { visit: true },
    });
    const bpjsNumber = order?.visit?.bpjsNumber ?? undefined;

    // Call real BPJS VClaim/PCare API with retry logic
    const verificationResult = await this.bpjsApiService.verifyEligibility(
      dto.sepNumber,
      bpjsNumber,
    );

    if (!verificationResult.success) {
      // Update status to FAILED with error details
      await this.prisma.bpjsOrderDetail.update({
        where: { orderId },
        data: {
          sepNumber: dto.sepNumber,
          verificationStatus: BpjsVerificationStatus.FAILED,
          notes: verificationResult.message,
        },
      });

      throw new BadRequestException({
        errorCode: verificationResult.errorCode || 'BPJS_VERIFICATION_FAILED',
        message: verificationResult.message,
      });
    }

    // Update with verified data from BPJS API response
    const apiData = verificationResult.data;
    const updated = await this.prisma.bpjsOrderDetail.update({
      where: { orderId },
      data: {
        sepNumber: dto.sepNumber,
        referringFacilityCode:
          dto.referringFacilityCode ??
          apiData?.ppiPenerima?.kode ??
          existing.referringFacilityCode,
        referringFacilityName:
          apiData?.ppiPenerima?.nama ?? existing.referringFacilityName,
        classLevel:
          dto.classLevel ??
          (apiData?.peserta?.hakKelas?.kode
            ? parseInt(apiData.peserta.hakKelas.kode, 10)
            : existing.classLevel),
        diagnosisCode: apiData?.diagnosa?.kode ?? existing.diagnosisCode,
        diagnosisName: apiData?.diagnosa?.nama ?? existing.diagnosisName,
        verificationStatus: BpjsVerificationStatus.VERIFIED,
        verifiedAt: new Date(),
        verifiedBy: userId,
      },
    });

    return {
      success: true,
      message: 'Verifikasi BPJS berhasil',
      data: updated,
    };
  }
}
