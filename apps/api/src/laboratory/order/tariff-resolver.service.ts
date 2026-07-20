import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { InsuranceConsolidationService } from '../../insurance/insurance-consolidation.service';
import { Decimal } from '@prisma/client/runtime/library';

export interface TariffResult {
  basePrice: number;
  discount: number;
  finalPrice: number;
  tariffId: string | null;
  resolution:
    | 'SPECIFIC'
    | 'CLINIC_ONLY'
    | 'INSURANCE_ONLY'
    | 'DEFAULT'
    | 'FALLBACK';
}

export interface OrderPricing {
  items: Array<{ testId: string; tariff: TariffResult }>;
  subtotal: number;
  totalDiscount: number;
  totalAmount: number;
}

@Injectable()
export class TariffResolverService {
  private readonly logger = new Logger(TariffResolverService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly consolidationService: InsuranceConsolidationService,
  ) {}

  /**
   * Resolves the price for a test using priority-based tariff lookup:
   * 1. SPECIFIC: clinic + insurance match
   * 2. CLINIC_ONLY: clinic match, no insurance
   * 3. INSURANCE_ONLY: insurance match, no clinic
   * 4. DEFAULT: no clinic, no insurance
   * 5. FALLBACK: TestMaster.price with 0 discount
   *
   * Only tariffs within their effective date range are considered.
   * When multiple valid tariffs match, the most recent effectiveFrom is selected.
   */
  async resolvePrice(
    testId: string,
    clinicId?: string,
    insuranceId?: string,
  ): Promise<TariffResult> {
    const now = new Date();

    // Date filter: effectiveFrom <= now AND (effectiveTo is null OR effectiveTo >= now)
    const dateFilter = {
      effectiveFrom: { lte: now },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gte: now } },
      ],
    };

    // Order by most recent effectiveFrom to pick the latest valid tariff
    const orderByEffective = { effectiveFrom: 'desc' as const };

    // Step 1: Specific (clinic + insurance)
    if (clinicId && insuranceId) {
      const tariff = await this.prisma.tariff.findFirst({
        where: { testId, clinicId, insuranceId, ...dateFilter },
        orderBy: orderByEffective,
      });
      if (tariff) {
        return this.buildResult(tariff.id, tariff.price, tariff.discount, 'SPECIFIC');
      }
    }

    // Step 2: Clinic-only
    if (clinicId) {
      const tariff = await this.prisma.tariff.findFirst({
        where: { testId, clinicId, insuranceId: null, ...dateFilter },
        orderBy: orderByEffective,
      });
      if (tariff) {
        return this.buildResult(tariff.id, tariff.price, tariff.discount, 'CLINIC_ONLY');
      }
    }

    // Step 3: Insurance-only
    if (insuranceId) {
      const tariff = await this.prisma.tariff.findFirst({
        where: { testId, clinicId: null, insuranceId, ...dateFilter },
        orderBy: orderByEffective,
      });
      if (tariff) {
        return this.buildResult(tariff.id, tariff.price, tariff.discount, 'INSURANCE_ONLY');
      }
    }

    // Step 4: Default tariff (no clinic, no insurance)
    const defaultTariff = await this.prisma.tariff.findFirst({
      where: { testId, clinicId: null, insuranceId: null, ...dateFilter },
      orderBy: orderByEffective,
    });
    if (defaultTariff) {
      return this.buildResult(
        defaultTariff.id,
        defaultTariff.price,
        defaultTariff.discount,
        'DEFAULT',
      );
    }

    // Step 5: Fallback to TestMaster.price
    const test = await this.prisma.testMaster.findFirst({
      where: { id: testId, deletedAt: null },
    });
    if (!test) {
      throw new NotFoundException(`Test with id '${testId}' not found`);
    }

    return this.buildResult(null, test.price, new Decimal(0), 'FALLBACK');
  }

  /**
   * Resolves pricing for multiple tests and aggregates totals.
   */
  async resolveOrderTotal(
    testIds: string[],
    clinicId?: string,
    insuranceId?: string,
  ): Promise<OrderPricing> {
    const items: Array<{ testId: string; tariff: TariffResult }> = [];

    for (const testId of testIds) {
      const tariff = await this.resolvePrice(testId, clinicId, insuranceId);
      items.push({ testId, tariff });
    }

    const subtotal = items.reduce((sum, item) => sum + item.tariff.basePrice, 0);
    const totalAmount = items.reduce((sum, item) => sum + item.tariff.finalPrice, 0);
    const totalDiscount = subtotal - totalAmount;

    return {
      items,
      subtotal,
      totalDiscount,
      totalAmount,
    };
  }

  /**
   * Resolves pricing for an order by resolving insurance from OrderInsurance PRIMARY (with fallback).
   * Logs deprecation warning when legacy Order.insuranceId is used.
   */
  async resolveOrderTotalForOrder(
    orderId: string,
    testIds: string[],
    clinicId?: string,
  ): Promise<OrderPricing> {
    const { insuranceId, source } =
      await this.consolidationService.getOrderPrimaryInsurance(orderId);

    if (source === 'ORDER_LEGACY_FK') {
      this.logger.warn(
        `[DEPRECATED] Tariff resolved via legacy Order.insuranceId for order ${orderId}`,
      );
    }

    return this.resolveOrderTotal(testIds, clinicId, insuranceId);
  }

  private buildResult(
    tariffId: string | null,
    price: Decimal,
    discount: Decimal,
    resolution: TariffResult['resolution'],
  ): TariffResult {
    const basePrice = Number(price);
    const discountPercent = Number(discount);
    const finalPrice = basePrice * (1 - discountPercent / 100);

    return {
      basePrice,
      discount: discountPercent,
      finalPrice,
      tariffId,
      resolution,
    };
  }
}
