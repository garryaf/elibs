import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PaymentMethod, VisitStatus, OrderStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { VisitNumberGeneratorService } from './visit-number-generator.service';
import { AuditService } from '../audit/audit.service';
import { CreateVisitDto } from './dto/create-visit.dto';
import { UpdateVisitDto } from './dto/update-visit.dto';
import { CancelVisitDto } from './dto/cancel-visit.dto';
import { VisitQueryDto } from './dto/visit-query.dto';

const VISIT_INCLUDE = {
  patient: true,
  doctor: true,
  clinic: true,
  insurance: true,
};

@Injectable()
export class VisitService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly visitNumberGenerator: VisitNumberGeneratorService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateVisitDto, userId: string, ipAddress?: string) {
    // Validate patient exists and is not soft-deleted
    await this.validatePatientExists(dto.patientId);

    // Validate optional references
    if (dto.doctorId) {
      await this.validateDoctorExists(dto.doctorId);
    }
    if (dto.clinicId) {
      await this.validateClinicExists(dto.clinicId);
    }
    if (dto.insuranceId) {
      await this.validateInsuranceExists(dto.insuranceId);
    }

    // Validate payment-specific fields
    this.validatePaymentFields(dto);

    // Generate unique visit number
    const visitNumber = await this.visitNumberGenerator.generate();

    // Create Visit record with status REGISTERED
    const visit = await this.prisma.visit.create({
      data: {
        visitNumber,
        patientId: dto.patientId,
        paymentMethod: dto.paymentMethod,
        doctorId: dto.doctorId ?? null,
        clinicId: dto.clinicId ?? null,
        insuranceId: dto.insuranceId ?? null,
        bpjsNumber: dto.bpjsNumber ?? null,
      },
      include: VISIT_INCLUDE,
    });

    // Audit log
    const visitData: Record<string, unknown> = { ...visit };
    await this.auditService.log(
      userId,
      'CREATE',
      'Visit',
      visit.id,
      null,
      visitData,
      ipAddress,
    );

    return {
      success: true,
      message: 'Visit created successfully',
      data: visit,
    };
  }

  private async validatePatientExists(patientId: string): Promise<void> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, deletedAt: null },
    });
    if (!patient) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: 'Patient not found',
      });
    }
  }

  private async validateDoctorExists(doctorId: string): Promise<void> {
    const doctor = await this.prisma.doctor.findFirst({
      where: { id: doctorId, isActive: true, deletedAt: null },
    });
    if (!doctor) {
      throw new BadRequestException({
        errorCode: 'ERR_VALIDATION',
        message: 'Doctor not found or inactive',
      });
    }
  }

  private async validateClinicExists(clinicId: string): Promise<void> {
    const clinic = await this.prisma.clinic.findFirst({
      where: { id: clinicId, isActive: true, deletedAt: null },
    });
    if (!clinic) {
      throw new BadRequestException({
        errorCode: 'ERR_VALIDATION',
        message: 'Clinic not found or inactive',
      });
    }
  }

  private async validateInsuranceExists(insuranceId: string): Promise<void> {
    const insurance = await this.prisma.insurance.findFirst({
      where: { id: insuranceId, isActive: true, deletedAt: null },
    });
    if (!insurance) {
      throw new BadRequestException({
        errorCode: 'ERR_VALIDATION',
        message: 'Insurance not found or inactive',
      });
    }
  }

  private validatePaymentFields(dto: CreateVisitDto | UpdateVisitDto): void {
    const paymentMethod = dto.paymentMethod;
    if (!paymentMethod) return;

    if (paymentMethod === PaymentMethod.BPJS) {
      if (!dto.bpjsNumber || !/^\d{13}$/.test(dto.bpjsNumber)) {
        throw new BadRequestException({
          errorCode: 'ERR_VALIDATION',
          message: 'BPJS number must be exactly 13 digits',
        });
      }
    }

    if (paymentMethod === PaymentMethod.INSURANCE) {
      if (!dto.insuranceId) {
        throw new BadRequestException({
          errorCode: 'ERR_VALIDATION',
          message: 'Insurance ID is required for INSURANCE payment method',
        });
      }
    }

    // CASH: no additional validation — bpjsNumber and insuranceId are ignored
  }

  private validateStatusTransition(
    current: VisitStatus,
    target: VisitStatus,
  ): void {
    const allowedTransitions: Record<VisitStatus, VisitStatus[]> = {
      [VisitStatus.REGISTERED]: [VisitStatus.IN_PROGRESS, VisitStatus.CANCELLED],
      [VisitStatus.IN_PROGRESS]: [VisitStatus.COMPLETED, VisitStatus.CANCELLED],
      [VisitStatus.COMPLETED]: [],
      [VisitStatus.CANCELLED]: [],
    };

    const allowed = allowedTransitions[current];
    if (!allowed || !allowed.includes(target)) {
      throw new BadRequestException({
        errorCode: 'ERR_INVALID_STATE',
        message: `Cannot transition from ${current} to ${target}`,
      });
    }
  }

  async findAll(query: VisitQueryDto) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};

    // Search filter: case-insensitive partial match on patient.name, patient.mrn, OR visitNumber
    if (query.search) {
      where.OR = [
        { patient: { name: { contains: query.search, mode: 'insensitive' } } },
        { patient: { mrn: { contains: query.search, mode: 'insensitive' } } },
        { visitNumber: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Status filter: exact match on VisitStatus enum value
    if (query.status) {
      where.status = query.status;
    }

    // Date range filter: registrationDate >= startDate AND <= endDate (inclusive)
    if (query.startDate || query.endDate) {
      where.registrationDate = {};
      if (query.startDate) {
        where.registrationDate.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.registrationDate.lte = new Date(query.endDate + 'T23:59:59.999Z');
      }
    }

    // Doctor filter
    if (query.doctorId) {
      where.doctorId = query.doctorId;
    }

    // Clinic filter
    if (query.clinicId) {
      where.clinicId = query.clinicId;
    }

    const include = {
      patient: { select: { id: true, name: true, mrn: true } },
      doctor: { select: { id: true, name: true } },
      clinic: { select: { id: true, name: true } },
      insurance: { select: { id: true, name: true } },
    };

    const [data, total] = await Promise.all([
      this.prisma.visit.findMany({
        where,
        skip,
        take: limit,
        orderBy: { registrationDate: 'desc' },
        include,
      }),
      this.prisma.visit.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      message: 'Visits retrieved successfully',
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async findById(id: string) {
    const visit = await this.prisma.visit.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: true,
        clinic: true,
        insurance: true,
        orders: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!visit) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: 'Visit not found',
      });
    }

    return {
      success: true,
      message: 'Visit retrieved successfully',
      data: visit,
    };
  }

  async update(
    id: string,
    dto: UpdateVisitDto,
    userId: string,
    ipAddress?: string,
  ) {
    // 1. Validate visit exists
    const visit = await this.prisma.visit.findUnique({
      where: { id },
      include: VISIT_INCLUDE,
    });

    if (!visit) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: 'Visit not found',
      });
    }

    // 2. Reject updates on terminal statuses
    if (visit.status === 'COMPLETED' || visit.status === 'CANCELLED') {
      throw new BadRequestException({
        errorCode: 'ERR_INVALID_STATE',
        message: 'Cannot update visit in COMPLETED/CANCELLED status',
      });
    }

    // 3. Determine the effective payment method (new or existing)
    const effectivePaymentMethod = dto.paymentMethod ?? visit.paymentMethod;

    // 4. Re-validate payment fields if paymentMethod changes
    // Build a merged DTO-like object for payment validation
    const paymentValidationDto = {
      paymentMethod: effectivePaymentMethod,
      bpjsNumber: dto.bpjsNumber !== undefined ? dto.bpjsNumber : visit.bpjsNumber,
      insuranceId: dto.insuranceId !== undefined ? dto.insuranceId : visit.insuranceId,
    };

    if (dto.paymentMethod) {
      this.validatePaymentFields(paymentValidationDto as CreateVisitDto | UpdateVisitDto);
    }

    // 5. Validate references if provided
    if (dto.doctorId) {
      await this.validateDoctorExists(dto.doctorId);
    }
    if (dto.clinicId) {
      await this.validateClinicExists(dto.clinicId);
    }
    if (dto.insuranceId) {
      await this.validateInsuranceExists(dto.insuranceId);
    }

    // 6. Build update data — only mutable fields from the DTO
    const updateData: Record<string, unknown> = {};

    if (dto.paymentMethod !== undefined) {
      updateData.paymentMethod = dto.paymentMethod;
    }
    if (dto.doctorId !== undefined) {
      updateData.doctorId = dto.doctorId;
    }
    if (dto.clinicId !== undefined) {
      updateData.clinicId = dto.clinicId;
    }
    if (dto.insuranceId !== undefined) {
      updateData.insuranceId = dto.insuranceId;
    }
    if (dto.bpjsNumber !== undefined) {
      updateData.bpjsNumber = dto.bpjsNumber;
    }

    // 7. Track old vs new values for audit (only fields that actually changed)
    const oldValues: Record<string, unknown> = {};
    const newValues: Record<string, unknown> = {};

    for (const [key, newValue] of Object.entries(updateData)) {
      const oldValue = (visit as Record<string, unknown>)[key];
      if (oldValue !== newValue) {
        oldValues[key] = oldValue;
        newValues[key] = newValue;
      }
    }

    // 8. Update the visit record
    const updatedVisit = await this.prisma.visit.update({
      where: { id },
      data: updateData,
      include: VISIT_INCLUDE,
    });

    // 9. Audit log — only if something actually changed
    if (Object.keys(newValues).length > 0) {
      await this.auditService.log(
        userId,
        'UPDATE',
        'Visit',
        visit.id,
        oldValues,
        newValues,
        ipAddress,
      );
    }

    return {
      success: true,
      message: 'Visit updated successfully',
      data: updatedVisit,
    };
  }

  async cancel(
    id: string,
    dto: CancelVisitDto,
    userId: string,
    ipAddress?: string,
  ) {
    // Validate visit exists
    const visit = await this.prisma.visit.findUnique({
      where: { id },
      include: VISIT_INCLUDE,
    });

    if (!visit) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: 'Visit not found',
      });
    }

    // Validate visit is in a cancellable status
    if (visit.status === 'COMPLETED' || visit.status === 'CANCELLED') {
      throw new BadRequestException({
        errorCode: 'ERR_INVALID_STATE',
        message: `Cannot cancel visit in ${visit.status} status`,
      });
    }

    // Validate all orders are in PENDING_PAYMENT status
    const orders = await this.prisma.order.findMany({
      where: { visitId: id },
    });

    if (orders.length > 0) {
      const blockingOrders = orders.filter(
        (order) => order.status !== 'PENDING_PAYMENT',
      );

      if (blockingOrders.length > 0) {
        const blockingIds = blockingOrders.map((o) => o.id);
        throw new BadRequestException({
          errorCode: 'ERR_INVALID_STATE',
          message: `Cannot cancel: orders [${blockingIds.join(', ')}] are beyond PENDING_PAYMENT`,
        });
      }
    }

    // Transition to CANCELLED
    const cancelledAt = new Date();
    const updatedVisit = await this.prisma.visit.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt,
        cancelReason: dto.reason,
      },
      include: VISIT_INCLUDE,
    });

    // Audit log
    await this.auditService.log(
      userId,
      'CANCEL',
      'Visit',
      visit.id,
      null,
      { cancelReason: dto.reason, cancelledAt },
      ipAddress,
    );

    return {
      success: true,
      message: 'Visit cancelled successfully',
      data: updatedVisit,
    };
  }

  async validateVisitForOrder(visitId: string): Promise<void> {
    const visit = await this.prisma.visit.findUnique({
      where: { id: visitId },
      select: { id: true, status: true },
    });

    if (!visit) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: 'Visit not found',
      });
    }

    if (
      visit.status === VisitStatus.CANCELLED ||
      visit.status === VisitStatus.COMPLETED
    ) {
      throw new BadRequestException({
        errorCode: 'ERR_INVALID_STATE',
        message: `Cannot add order to visit in ${visit.status} status`,
      });
    }
  }

  async transitionToInProgress(visitId: string) {
    const visit = await this.prisma.visit.findUnique({
      where: { id: visitId },
      select: { id: true, status: true },
    });

    if (!visit) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: 'Visit not found',
      });
    }

    // Idempotent: if already IN_PROGRESS, do nothing
    if (visit.status === VisitStatus.IN_PROGRESS) {
      return;
    }

    // Validate the transition is allowed
    this.validateStatusTransition(visit.status, VisitStatus.IN_PROGRESS);

    await this.prisma.visit.update({
      where: { id: visitId },
      data: { status: VisitStatus.IN_PROGRESS },
    });
  }

  async evaluateCompletion(visitId: string) {
    const visit = await this.prisma.visit.findUnique({
      where: { id: visitId },
      select: { id: true, status: true },
    });

    if (!visit) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: 'Visit not found',
      });
    }

    // Only evaluate if visit is IN_PROGRESS
    if (visit.status !== VisitStatus.IN_PROGRESS) {
      return;
    }

    // Query all orders under this visit
    const orders = await this.prisma.order.findMany({
      where: { visitId },
      select: { status: true },
    });

    // If there are no orders, don't transition (visit needs at least one order to complete)
    if (orders.length === 0) {
      return;
    }

    // Check if ALL orders are in a terminal state (NOTIFIED or CANCELLED)
    const allTerminal = orders.every(
      (order) =>
        order.status === OrderStatus.NOTIFIED ||
        order.status === OrderStatus.CANCELLED,
    );

    if (allTerminal) {
      this.validateStatusTransition(visit.status, VisitStatus.COMPLETED);
      await this.prisma.visit.update({
        where: { id: visitId },
        data: { status: VisitStatus.COMPLETED },
      });
    }
  }
}
