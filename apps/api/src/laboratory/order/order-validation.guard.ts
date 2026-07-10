import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { VisitStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * UUID v4 format regex for validation.
 */
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Centralized validation guard that enforces mandatory Visit linkage
 * for all order creation paths. This guard is invoked as the first
 * validation step before any persistence operation.
 *
 * Validation sequence:
 *   1. visitId presence and UUID format
 *   2. Visit existence
 *   3. Visit status is REGISTERED or IN_PROGRESS
 *   4. Visit.patientId matches Order.patientId
 */
@Injectable()
export class OrderValidationGuard {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validates visit linkage for order creation.
   * Throws appropriate NestJS exceptions on failure.
   */
  async validate(visitId: string, patientId: string): Promise<void> {
    // Step 1: visitId presence and UUID format check
    if (!visitId) {
      throw new BadRequestException({
        errorCode: 'ERR_VALIDATION',
        message:
          'visitId is required. Create a Visit first via POST /api/v1/visits',
      });
    }

    if (!UUID_V4_REGEX.test(visitId)) {
      throw new BadRequestException({
        errorCode: 'ERR_VALIDATION',
        message: 'visitId must be a valid UUID',
      });
    }

    // Step 2: Visit existence query
    const visit = await this.prisma.visit.findUnique({
      where: { id: visitId },
      select: { id: true, status: true, patientId: true },
    });

    if (!visit) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: 'Visit not found',
      });
    }

    // Step 3: Visit status is REGISTERED or IN_PROGRESS
    if (
      visit.status !== VisitStatus.REGISTERED &&
      visit.status !== VisitStatus.IN_PROGRESS
    ) {
      throw new BadRequestException({
        errorCode: 'ERR_INVALID_STATE',
        message: `Cannot add order to visit in ${visit.status} status`,
      });
    }

    // Step 4: Visit.patientId matches patientId
    if (visit.patientId !== patientId) {
      throw new BadRequestException({
        errorCode: 'ERR_VALIDATION',
        message:
          'Patient mismatch: order patientId does not match visit patientId',
      });
    }
  }
}
