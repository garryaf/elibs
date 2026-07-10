import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ClaimStatus } from '@prisma/client';
import { SubmitClaimDto, ApproveClaimDto, RejectClaimDto } from './dto/claim.dto';

/**
 * Valid claim status transitions:
 * PENDING → SUBMITTED
 * SUBMITTED → UNDER_REVIEW
 * UNDER_REVIEW → APPROVED | PARTIALLY_APPROVED | REJECTED
 * APPROVED → PAID
 * PARTIALLY_APPROVED → PAID
 */
const VALID_TRANSITIONS: Record<ClaimStatus, ClaimStatus[]> = {
  [ClaimStatus.PENDING]: [ClaimStatus.SUBMITTED],
  [ClaimStatus.SUBMITTED]: [ClaimStatus.UNDER_REVIEW],
  [ClaimStatus.UNDER_REVIEW]: [
    ClaimStatus.APPROVED,
    ClaimStatus.PARTIALLY_APPROVED,
    ClaimStatus.REJECTED,
  ],
  [ClaimStatus.APPROVED]: [ClaimStatus.PAID],
  [ClaimStatus.PARTIALLY_APPROVED]: [ClaimStatus.PAID],
  [ClaimStatus.REJECTED]: [],
  [ClaimStatus.PAID]: [],
};

@Injectable()
export class ClaimService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Submit a claim: PENDING → SUBMITTED
   */
  async submitClaim(dto: SubmitClaimDto) {
    const orderInsurance = await this.findOrderInsuranceOrThrow(dto.orderInsuranceId);

    this.validateTransition(orderInsurance.claimStatus, ClaimStatus.SUBMITTED);

    const claimReference = dto.claimReference || (await this.generateClaimReference());

    const updated = await this.prisma.orderInsurance.update({
      where: { id: dto.orderInsuranceId },
      data: {
        claimStatus: ClaimStatus.SUBMITTED,
        claimReference,
        submittedAt: new Date(),
      },
      include: {
        insurance: { select: { id: true, code: true, name: true, type: true } },
      },
    });

    return updated;
  }

  /**
   * Mark claim under review: SUBMITTED → UNDER_REVIEW
   */
  async reviewClaim(orderInsuranceId: string) {
    const orderInsurance = await this.findOrderInsuranceOrThrow(orderInsuranceId);

    this.validateTransition(orderInsurance.claimStatus, ClaimStatus.UNDER_REVIEW);

    const updated = await this.prisma.orderInsurance.update({
      where: { id: orderInsuranceId },
      data: {
        claimStatus: ClaimStatus.UNDER_REVIEW,
      },
      include: {
        insurance: { select: { id: true, code: true, name: true, type: true } },
      },
    });

    return updated;
  }

  /**
   * Approve claim: UNDER_REVIEW → APPROVED
   */
  async approveClaim(orderInsuranceId: string, dto: ApproveClaimDto) {
    const orderInsurance = await this.findOrderInsuranceOrThrow(orderInsuranceId);

    this.validateTransition(orderInsurance.claimStatus, ClaimStatus.APPROVED);

    const updated = await this.prisma.orderInsurance.update({
      where: { id: orderInsuranceId },
      data: {
        claimStatus: ClaimStatus.APPROVED,
        coveredAmount: dto.coveredAmount,
        copayAmount: dto.copayAmount ?? null,
        approvedAt: new Date(),
        notes: dto.notes ?? orderInsurance.notes,
      },
      include: {
        insurance: { select: { id: true, code: true, name: true, type: true } },
      },
    });

    return updated;
  }

  /**
   * Partially approve claim: UNDER_REVIEW → PARTIALLY_APPROVED
   */
  async partiallyApproveClaim(orderInsuranceId: string, dto: ApproveClaimDto) {
    const orderInsurance = await this.findOrderInsuranceOrThrow(orderInsuranceId);

    this.validateTransition(orderInsurance.claimStatus, ClaimStatus.PARTIALLY_APPROVED);

    const updated = await this.prisma.orderInsurance.update({
      where: { id: orderInsuranceId },
      data: {
        claimStatus: ClaimStatus.PARTIALLY_APPROVED,
        coveredAmount: dto.coveredAmount,
        copayAmount: dto.copayAmount ?? null,
        approvedAt: new Date(),
        notes: dto.notes ?? orderInsurance.notes,
      },
      include: {
        insurance: { select: { id: true, code: true, name: true, type: true } },
      },
    });

    return updated;
  }

  /**
   * Reject claim: UNDER_REVIEW → REJECTED
   */
  async rejectClaim(orderInsuranceId: string, dto: RejectClaimDto) {
    const orderInsurance = await this.findOrderInsuranceOrThrow(orderInsuranceId);

    this.validateTransition(orderInsurance.claimStatus, ClaimStatus.REJECTED);

    const updated = await this.prisma.orderInsurance.update({
      where: { id: orderInsuranceId },
      data: {
        claimStatus: ClaimStatus.REJECTED,
        rejectionReason: dto.rejectionReason,
        rejectedAt: new Date(),
      },
      include: {
        insurance: { select: { id: true, code: true, name: true, type: true } },
      },
    });

    return updated;
  }

  /**
   * Mark claim as paid: APPROVED/PARTIALLY_APPROVED → PAID
   */
  async markClaimPaid(orderInsuranceId: string) {
    const orderInsurance = await this.findOrderInsuranceOrThrow(orderInsuranceId);

    this.validateTransition(orderInsurance.claimStatus, ClaimStatus.PAID);

    const updated = await this.prisma.orderInsurance.update({
      where: { id: orderInsuranceId },
      data: {
        claimStatus: ClaimStatus.PAID,
        paidAt: new Date(),
      },
      include: {
        insurance: { select: { id: true, code: true, name: true, type: true } },
      },
    });

    return updated;
  }

  /**
   * Get all claim records for an order
   */
  async getClaimHistory(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const claims = await this.prisma.orderInsurance.findMany({
      where: { orderId },
      include: {
        insurance: { select: { id: true, code: true, name: true, type: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return { data: claims };
  }

  // ─── Private Helpers ───────────────────────────────────────────────────────

  private async findOrderInsuranceOrThrow(orderInsuranceId: string) {
    const orderInsurance = await this.prisma.orderInsurance.findUnique({
      where: { id: orderInsuranceId },
    });
    if (!orderInsurance) {
      throw new NotFoundException('Order insurance record not found');
    }
    return orderInsurance;
  }

  private validateTransition(currentStatus: ClaimStatus, targetStatus: ClaimStatus) {
    const allowed = VALID_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(targetStatus)) {
      throw new BadRequestException({
        errorCode: 'ERR_INVALID_STATE',
        message: `Cannot transition claim from ${currentStatus} to ${targetStatus}. Allowed transitions from ${currentStatus}: ${allowed.length > 0 ? allowed.join(', ') : 'none (terminal state)'}`,
      });
    }
  }

  /**
   * Generate claim reference: CLM-YYYYMMDD-XXXX
   */
  private async generateClaimReference(): Promise<string> {
    const today = new Date();
    const yyyy = today.getFullYear().toString();
    const mm = (today.getMonth() + 1).toString().padStart(2, '0');
    const dd = today.getDate().toString().padStart(2, '0');
    const dateStr = `${yyyy}${mm}${dd}`;

    // Count today's claims to determine the next sequential number
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const todayCount = await this.prisma.orderInsurance.count({
      where: {
        submittedAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    });

    const sequence = (todayCount + 1).toString().padStart(4, '0');
    return `CLM-${dateStr}-${sequence}`;
  }
}
