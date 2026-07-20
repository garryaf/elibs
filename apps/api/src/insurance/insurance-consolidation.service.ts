import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Insurance, PatientInsurance } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  OrderInsuranceResult,
  CascadeValidationResult,
} from './insurance-consolidation.dto';

@Injectable()
export class InsuranceConsolidationService {
  private readonly logger = new Logger(InsuranceConsolidationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns patient's effective insurance list.
   * Filters: isActive=true AND (validFrom <= today OR null) AND (validUntil >= today OR null)
   * Ordered by priority ASC.
   */
  async getActiveInsurances(patientId: string): Promise<PatientInsurance[]> {
    const today = new Date();

    return this.prisma.patientInsurance.findMany({
      where: {
        patientId,
        isActive: true,
        OR: [{ validFrom: null }, { validFrom: { lte: today } }],
        AND: [
          {
            OR: [{ validUntil: null }, { validUntil: { gte: today } }],
          },
        ],
      },
      orderBy: { priority: 'asc' },
      include: { insurance: true },
    });
  }

  /**
   * Validates that an insuranceId is within the patient's active enrollments.
   * Throws BadRequestException with descriptive message if invalid.
   */
  async validateVisitInsurance(
    patientId: string,
    insuranceId: string,
  ): Promise<void> {
    const activeInsurances = await this.getActiveInsurances(patientId);
    const isEnrolled = activeInsurances.some(
      (record) => record.insuranceId === insuranceId,
    );

    if (!isEnrolled) {
      throw new BadRequestException(
        `Insurance ${insuranceId} is not an active enrollment for patient ${patientId}`,
      );
    }
  }

  /**
   * Returns the default insurance for a patient (priority=1, active, valid dates).
   * Returns null if no default exists.
   */
  async getDefaultInsurance(
    patientId: string,
  ): Promise<PatientInsurance | null> {
    const today = new Date();

    return this.prisma.patientInsurance.findFirst({
      where: {
        patientId,
        priority: 1,
        isActive: true,
        OR: [{ validFrom: null }, { validFrom: { lte: today } }],
        AND: [
          {
            OR: [{ validUntil: null }, { validUntil: { gte: today } }],
          },
        ],
      },
      include: { insurance: true },
    });
  }

  /**
   * Returns the canonical insurance for a visit (from Visit.insuranceId).
   */
  async getVisitInsurance(visitId: string): Promise<Insurance | null> {
    const visit = await this.prisma.visit.findUnique({
      where: { id: visitId },
      include: { insurance: true },
    });

    if (!visit || !visit.insurance) {
      return null;
    }

    return visit.insurance;
  }

  /**
   * Returns the canonical primary insurance for an order.
   * Priority: OrderInsurance PRIMARY → Order.insuranceId fallback.
   * Logs deprecation warning when fallback is used.
   */
  async getOrderPrimaryInsurance(
    orderId: string,
  ): Promise<OrderInsuranceResult> {
    // Step 1: Try to find OrderInsurance junction with coverageType = PRIMARY
    const orderInsurance = await this.prisma.orderInsurance.findFirst({
      where: {
        orderId,
        coverageType: 'PRIMARY',
      },
    });

    if (orderInsurance) {
      return {
        insuranceId: orderInsurance.insuranceId,
        source: 'ORDER_INSURANCE_JUNCTION',
        orderInsurance,
      };
    }

    // Step 2: Fall back to Order.insuranceId (legacy FK)
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { insuranceId: true },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (order.insuranceId) {
      this.logger.warn({
        type: 'INSURANCE_DEPRECATION',
        field: 'Order.insuranceId',
        entityId: orderId,
        message: 'Legacy FK read — migrate to junction table',
      });

      return {
        insuranceId: order.insuranceId,
        source: 'ORDER_LEGACY_FK',
      };
    }

    // Neither junction record nor legacy FK exists
    throw new NotFoundException(
      `No primary insurance found for order ${orderId}`,
    );
  }

  /**
   * Validates full cascade: Order PRIMARY → Visit.insuranceId → PatientInsurance active.
   * Returns structured result with break point if inconsistent.
   */
  async validateCascadeConsistency(
    orderId: string,
  ): Promise<CascadeValidationResult> {
    // Step 1: Get the order with its visit relation
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { visit: true },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    // Step 2: Get order PRIMARY insurance
    let orderPrimaryInsurance: OrderInsuranceResult;
    try {
      orderPrimaryInsurance = await this.getOrderPrimaryInsurance(orderId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        // No insurance on order (cash payment) — nothing to validate
        return { isConsistent: true };
      }
      throw error;
    }

    const orderInsuranceId = orderPrimaryInsurance.insuranceId;
    const visitInsuranceId = order.visit.insuranceId;

    // Step 3: Check if order PRIMARY insuranceId matches visit.insuranceId
    if (!visitInsuranceId || orderInsuranceId !== visitInsuranceId) {
      return {
        isConsistent: false,
        breakLevel: 'ORDER',
        message: `Order primary insurance (${orderInsuranceId}) does not match visit insurance (${visitInsuranceId ?? 'none'})`,
        details: {
          orderInsuranceId,
          visitInsuranceId: visitInsuranceId ?? undefined,
        },
      };
    }

    // Step 4: Get patient active insurances and check if visit insurance is enrolled
    const activeInsurances = await this.getActiveInsurances(
      order.visit.patientId,
    );
    const patientActiveInsuranceIds = activeInsurances.map(
      (record) => record.insuranceId,
    );

    if (!patientActiveInsuranceIds.includes(visitInsuranceId)) {
      return {
        isConsistent: false,
        breakLevel: 'VISIT',
        message: `Visit insurance (${visitInsuranceId}) is not in patient's active enrollments`,
        details: {
          orderInsuranceId,
          visitInsuranceId,
          patientActiveInsurances: patientActiveInsuranceIds,
        },
      };
    }

    // All checks pass
    return { isConsistent: true };
  }

  /**
   * Returns patient insuranceId for API response (junction priority=1 or legacy fallback).
   * Tries PatientInsurance with priority=1 first, falls back to Patient.insuranceId
   * if no junction record exists (with deprecation warning).
   */
  async resolvePatientInsuranceId(
    patientId: string,
  ): Promise<string | null> {
    // Step 1: Try the junction table (priority=1, active, valid dates)
    const defaultInsurance = await this.getDefaultInsurance(patientId);

    if (defaultInsurance) {
      return defaultInsurance.insuranceId;
    }

    // Step 2: Fall back to Patient.insuranceId legacy FK
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { insuranceId: true },
    });

    if (patient?.insuranceId) {
      this.logger.warn({
        type: 'INSURANCE_DEPRECATION',
        field: 'Patient.insuranceId',
        entityId: patientId,
        message: 'Legacy FK read — migrate to junction table',
      });

      return patient.insuranceId;
    }

    // Neither source has a value
    return null;
  }
}
