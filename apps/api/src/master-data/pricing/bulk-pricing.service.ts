import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ApprovalType, ApprovalStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../laboratory/audit/audit.service';

export interface BulkAdjustDto {
  /** Filter: adjust only tests in this category */
  categoryId?: string;
  /** Filter: adjust only specific test IDs */
  testIds?: string[];
  /** Adjustment type: PERCENTAGE or FIXED */
  adjustmentType: 'PERCENTAGE' | 'FIXED';
  /** Adjustment value: percentage (e.g. 10 = +10%) or fixed amount (e.g. 5000 = +5000) */
  adjustmentValue: number;
  /** Reason for adjustment */
  reason: string;
  /** If true, requires MANAGER/OWNER approval before applying */
  requiresApproval?: boolean;
  /** Effective date (default: now) */
  effectiveFrom?: string;
}

export interface BulkAdjustPreview {
  testId: string;
  testCode: string;
  testName: string;
  currentPrice: number;
  newPrice: number;
  difference: number;
  percentChange: number;
}

export interface BulkAdjustResult {
  applied: boolean;
  approvalRequired: boolean;
  approvalId?: string;
  totalAffected: number;
  preview: BulkAdjustPreview[];
}

export interface PriceHistoryEntry {
  id: string;
  entityType: string;
  previousPrice: number;
  newPrice: number;
  previousDiscount: number | null;
  newDiscount: number | null;
  changeType: string;
  changeReason: string | null;
  changedByName: string | null;
  createdAt: string;
}

/**
 * BulkPricingService handles:
 * 1. Bulk price adjustments (by percentage or fixed amount)
 * 2. Price change logging (audit trail)
 * 3. Integration with ApprovalRequest for tariff change approval
 *
 * Requirements: Audit trail, bulk adjustment, approval workflow for pricing.
 */
@Injectable()
export class BulkPricingService {
  private readonly logger = new Logger(BulkPricingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Preview bulk price adjustment without applying it.
   */
  async previewBulkAdjust(dto: BulkAdjustDto): Promise<BulkAdjustPreview[]> {
    const tests = await this.getAffectedTests(dto);

    return tests.map((test) => {
      const currentPrice = Number(test.price);
      const newPrice = this.calculateNewPrice(currentPrice, dto);
      return {
        testId: test.id,
        testCode: test.code,
        testName: test.name,
        currentPrice,
        newPrice,
        difference: newPrice - currentPrice,
        percentChange: currentPrice > 0 ? Math.round(((newPrice - currentPrice) / currentPrice) * 100) : 0,
      };
    });
  }

  /**
   * Execute bulk price adjustment.
   * If requiresApproval=true, creates an ApprovalRequest instead of applying immediately.
   */
  async executeBulkAdjust(
    dto: BulkAdjustDto,
    userId: string,
    userName?: string,
  ): Promise<BulkAdjustResult> {
    const preview = await this.previewBulkAdjust(dto);

    if (preview.length === 0) {
      throw new BadRequestException({
        errorCode: 'ERR_NO_TESTS_AFFECTED',
        message: 'No tests match the filter criteria',
      });
    }

    // If approval required, create ApprovalRequest
    if (dto.requiresApproval) {
      const approval = await this.prisma.approvalRequest.create({
        data: {
          requestType: ApprovalType.TARIFF_CHANGE,
          requesterId: userId,
          currentLevel: 1,
          maxLevel: 1, // Single-level approval for price changes
          status: ApprovalStatus.PENDING,
          payload: {
            adjustmentType: dto.adjustmentType,
            adjustmentValue: dto.adjustmentValue,
            reason: dto.reason,
            effectiveFrom: dto.effectiveFrom,
            categoryId: dto.categoryId,
            testIds: dto.testIds,
            preview,
          } as unknown as Prisma.InputJsonValue,
          reason: dto.reason,
        },
      });

      this.logger.log(
        `Bulk price adjustment proposal created (approval ${approval.id}): ${preview.length} tests, ${dto.adjustmentType} ${dto.adjustmentValue}`,
      );

      return {
        applied: false,
        approvalRequired: true,
        approvalId: approval.id,
        totalAffected: preview.length,
        preview,
      };
    }

    // Apply immediately
    await this.applyBulkAdjust(preview, dto, userId, userName);

    return {
      applied: true,
      approvalRequired: false,
      totalAffected: preview.length,
      preview,
    };
  }

  /**
   * Apply an approved bulk adjustment (called after approval).
   */
  async applyApprovedBulkAdjust(approvalId: string, approverId: string): Promise<void> {
    const approval = await this.prisma.approvalRequest.findUnique({
      where: { id: approvalId },
    });

    if (!approval || approval.status !== ApprovalStatus.APPROVED) {
      throw new BadRequestException('Approval not found or not in APPROVED status');
    }

    const payload = approval.payload as unknown as {
      adjustmentType: 'PERCENTAGE' | 'FIXED';
      adjustmentValue: number;
      reason: string;
      preview: BulkAdjustPreview[];
    };

    // Get requester name
    const requester = await this.prisma.user.findUnique({
      where: { id: approval.requesterId },
      select: { name: true },
    });

    await this.applyBulkAdjust(
      payload.preview,
      { adjustmentType: payload.adjustmentType, adjustmentValue: payload.adjustmentValue, reason: payload.reason },
      approval.requesterId,
      requester?.name ?? undefined,
      approvalId,
    );
  }

  /**
   * Log a single price change (called by MasterDataService on individual updates).
   */
  async logPriceChange(params: {
    entityType: 'TEST_MASTER' | 'TARIFF' | 'PRICE_LIST_ITEM';
    entityId: string;
    testId?: string;
    testCode?: string;
    testName?: string;
    previousPrice: number;
    newPrice: number;
    previousDiscount?: number;
    newDiscount?: number;
    changeType: 'MANUAL' | 'BULK_ADJUST' | 'APPROVAL';
    changeReason?: string;
    changedBy: string;
    changedByName?: string;
    approvalId?: string;
  }): Promise<void> {
    await this.prisma.priceChangeLog.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        testId: params.testId,
        testCode: params.testCode,
        testName: params.testName,
        previousPrice: params.previousPrice,
        newPrice: params.newPrice,
        previousDiscount: params.previousDiscount,
        newDiscount: params.newDiscount,
        changeType: params.changeType,
        changeReason: params.changeReason,
        changedBy: params.changedBy,
        changedByName: params.changedByName,
        approvalId: params.approvalId,
      },
    });
  }

  /**
   * Get price change history for a specific test.
   */
  async getPriceHistory(testId: string, limit = 20): Promise<PriceHistoryEntry[]> {
    const logs = await this.prisma.priceChangeLog.findMany({
      where: { testId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs.map((log) => ({
      id: log.id,
      entityType: log.entityType,
      previousPrice: Number(log.previousPrice),
      newPrice: Number(log.newPrice),
      previousDiscount: log.previousDiscount ? Number(log.previousDiscount) : null,
      newDiscount: log.newDiscount ? Number(log.newDiscount) : null,
      changeType: log.changeType,
      changeReason: log.changeReason,
      changedByName: log.changedByName,
      createdAt: log.createdAt.toISOString(),
    }));
  }

  /**
   * Get all price change history (for admin overview).
   */
  async getAllPriceHistory(page = 1, limit = 20): Promise<{ data: PriceHistoryEntry[]; meta: { total: number; page: number; limit: number } }> {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      this.prisma.priceChangeLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.priceChangeLog.count(),
    ]);

    return {
      data: logs.map((log) => ({
        id: log.id,
        entityType: log.entityType,
        previousPrice: Number(log.previousPrice),
        newPrice: Number(log.newPrice),
        previousDiscount: log.previousDiscount ? Number(log.previousDiscount) : null,
        newDiscount: log.newDiscount ? Number(log.newDiscount) : null,
        changeType: log.changeType,
        changeReason: log.changeReason,
        changedByName: log.changedByName,
        createdAt: log.createdAt.toISOString(),
      })),
      meta: { total, page, limit },
    };
  }

  // ─── Private Methods ──────────────────────────────────────────────────────────

  private async getAffectedTests(dto: BulkAdjustDto) {
    const where: Prisma.TestMasterWhereInput = { deletedAt: null, isActive: true };

    if (dto.categoryId) {
      where.categoryId = dto.categoryId;
    }
    if (dto.testIds && dto.testIds.length > 0) {
      where.id = { in: dto.testIds };
    }

    return this.prisma.testMaster.findMany({
      where,
      select: { id: true, code: true, name: true, price: true },
      orderBy: { code: 'asc' },
    });
  }

  private calculateNewPrice(currentPrice: number, dto: Pick<BulkAdjustDto, 'adjustmentType' | 'adjustmentValue'>): number {
    if (dto.adjustmentType === 'PERCENTAGE') {
      const factor = 1 + dto.adjustmentValue / 100;
      return Math.round(currentPrice * factor);
    }
    // FIXED
    return Math.max(0, currentPrice + dto.adjustmentValue);
  }

  private async applyBulkAdjust(
    preview: BulkAdjustPreview[],
    dto: Pick<BulkAdjustDto, 'adjustmentType' | 'adjustmentValue' | 'reason'>,
    userId: string,
    userName?: string,
    approvalId?: string,
  ): Promise<void> {
    for (const item of preview) {
      // Update the test price
      await this.prisma.testMaster.update({
        where: { id: item.testId },
        data: { price: item.newPrice },
      });

      // Log the price change
      await this.logPriceChange({
        entityType: 'TEST_MASTER',
        entityId: item.testId,
        testId: item.testId,
        testCode: item.testCode,
        testName: item.testName,
        previousPrice: item.currentPrice,
        newPrice: item.newPrice,
        changeType: approvalId ? 'APPROVAL' : 'BULK_ADJUST',
        changeReason: dto.reason,
        changedBy: userId,
        changedByName: userName,
        approvalId,
      });
    }

    // Audit log
    await this.auditService.log(
      userId,
      'BULK_PRICE_ADJUSTMENT',
      'TestMaster',
      preview[0]?.testId ?? userId, // Use first test ID as entity reference
      { count: preview.length, adjustmentType: dto.adjustmentType, adjustmentValue: dto.adjustmentValue },
      { reason: dto.reason, approvalId },
    );

    this.logger.log(
      `Bulk price adjustment applied: ${preview.length} tests, ${dto.adjustmentType} ${dto.adjustmentValue}, by ${userName ?? userId}`,
    );
  }
}
