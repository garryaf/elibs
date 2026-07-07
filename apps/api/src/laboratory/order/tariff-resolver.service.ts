import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
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
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves the price for a test using priority-based tariff lookup:
   * 1. SPECIFIC: clinic + insurance match
   * 2. CLINIC_ONLY: clinic match, no insurance
   * 3. INSURANCE_ONLY: insurance match, no clinic
   * 4. DEFAULT: no clinic, no insurance
   * 5. FALLBACK: TestMaster.price with 0 discount
   */
  async resolvePrice(
    testId: string,
    clinicId?: string,
    insuranceId?: string,
  ): Promise<TariffResult> {
    // Step 1: Specific (clinic + insurance)
    if (clinicId && insuranceId) {
      const tariff = await this.prisma.tariff.findFirst({
        where: { testId, clinicId, insuranceId },
      });
      if (tariff) {
        return this.buildResult(tariff.id, tariff.price, tariff.discount, 'SPECIFIC');
      }
    }

    // Step 2: Clinic-only
    if (clinicId) {
      const tariff = await this.prisma.tariff.findFirst({
        where: { testId, clinicId, insuranceId: null },
      });
      if (tariff) {
        return this.buildResult(tariff.id, tariff.price, tariff.discount, 'CLINIC_ONLY');
      }
    }

    // Step 3: Insurance-only
    if (insuranceId) {
      const tariff = await this.prisma.tariff.findFirst({
        where: { testId, clinicId: null, insuranceId },
      });
      if (tariff) {
        return this.buildResult(tariff.id, tariff.price, tariff.discount, 'INSURANCE_ONLY');
      }
    }

    // Step 4: Default tariff (no clinic, no insurance)
    const defaultTariff = await this.prisma.tariff.findFirst({
      where: { testId, clinicId: null, insuranceId: null },
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
