import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Context for resolving a test price.
 * The service uses these values to find the most specific matching price.
 */
export interface PricingContext {
  clinicId?: string;
  insuranceId?: string;
  corporateId?: string;
  packageId?: string;
  promotionCode?: string;
  asOfDate?: Date;
}

/**
 * A single pricing adjustment applied during resolution.
 */
export interface PricingAdjustment {
  type: 'PRICE_LIST' | 'TARIFF' | 'CORPORATE' | 'PACKAGE' | 'PROMOTION';
  description: string;
  amount: Decimal;
}

/**
 * Result of price resolution including base, adjustments, and final price.
 */
export interface PricingResult {
  basePrice: Decimal;
  adjustments: PricingAdjustment[];
  finalPrice: Decimal;
  resolution: 'PRICE_LIST' | 'SPECIFIC' | 'CLINIC_ONLY' | 'INSURANCE_ONLY' | 'DEFAULT' | 'FALLBACK';
  tariffId?: string;
  priceListItemId?: string;
}

/**
 * Consolidated pricing service replacing duplicate TariffResolverService implementations.
 *
 * Resolution order:
 * 1. Check PriceListItem matching context (corporateId, insuranceId, packageId, promotionCode)
 * 2. Check Tariff table matching testId + clinicId + insuranceId (priority: specific → clinic → insurance → default)
 * 3. Fallback to TestMaster.price
 *
 * Requirements: 7.1, 7.2, 7.6
 */
@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves the price for a test using priority-based multi-tier lookup.
   *
   * Resolution order:
   * 1. PriceListItem matching context (entity-based price lists)
   * 2. Tariff table (specific → clinic-only → insurance-only → default)
   * 3. TestMaster.price fallback
   */
  async resolvePrice(
    testId: string,
    context: PricingContext = {},
  ): Promise<PricingResult> {
    const asOfDate = context.asOfDate ?? new Date();
    const adjustments: PricingAdjustment[] = [];

    // Step 1: Check PriceListItem matching context
    const priceListResult = await this.resolvePriceListItem(testId, context, asOfDate);
    if (priceListResult) {
      const basePrice = priceListResult.price;
      const discountPercent = Number(priceListResult.discount);
      const discountAmount = basePrice.mul(new Decimal(discountPercent)).div(new Decimal(100));
      const finalPrice = basePrice.sub(discountAmount);

      if (discountPercent > 0) {
        adjustments.push({
          type: 'PRICE_LIST',
          description: `Price list discount: ${discountPercent}%`,
          amount: discountAmount.neg(),
        });
      }

      return {
        basePrice,
        adjustments,
        finalPrice,
        resolution: 'PRICE_LIST',
        priceListItemId: priceListResult.id,
      };
    }

    // Step 2: Check Tariff table with priority resolution
    const tariffResult = await this.resolveTariff(testId, context, asOfDate);
    if (tariffResult) {
      const basePrice = tariffResult.tariff.price;
      const discountPercent = Number(tariffResult.tariff.discount);
      const discountAmount = basePrice.mul(new Decimal(discountPercent)).div(new Decimal(100));
      const finalPrice = basePrice.sub(discountAmount);

      if (discountPercent > 0) {
        adjustments.push({
          type: 'TARIFF',
          description: `Tariff discount (${tariffResult.resolution}): ${discountPercent}%`,
          amount: discountAmount.neg(),
        });
      }

      return {
        basePrice,
        adjustments,
        finalPrice,
        resolution: tariffResult.resolution,
        tariffId: tariffResult.tariff.id,
      };
    }

    // Step 3: Fallback to TestMaster.price
    const test = await this.prisma.testMaster.findFirst({
      where: { id: testId, deletedAt: null },
    });

    if (!test) {
      throw new NotFoundException(`Test with id '${testId}' not found`);
    }

    return {
      basePrice: test.price,
      adjustments: [],
      finalPrice: test.price,
      resolution: 'FALLBACK',
    };
  }

  /**
   * Retrieves a price list by ID.
   */
  async getPriceList(priceListId: string) {
    const priceList = await this.prisma.priceList.findUnique({
      where: { id: priceListId },
      include: { items: true },
    });

    if (!priceList) {
      throw new NotFoundException(`Price list with id '${priceListId}' not found`);
    }

    return priceList;
  }

  /**
   * Retrieves all active price lists.
   * Active means: isActive=true AND effectiveFrom <= now AND (effectiveTo is null OR effectiveTo >= now)
   */
  async getActivePriceLists() {
    const now = new Date();

    return this.prisma.priceList.findMany({
      where: {
        isActive: true,
        effectiveFrom: { lte: now },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: now } },
        ],
      },
      include: { items: true },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  /**
   * Creates a new price list.
   * Requirements: 7.1, 7.2
   */
  async createPriceList(data: {
    name: string;
    description?: string;
    type: string;
    entityId?: string;
    effectiveFrom: string;
    effectiveTo?: string;
    isActive?: boolean;
  }) {
    return this.prisma.priceList.create({
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        entityId: data.entityId,
        effectiveFrom: new Date(data.effectiveFrom),
        effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null,
        isActive: data.isActive ?? true,
      },
      include: { items: true },
    });
  }

  /**
   * Updates an existing price list.
   * Requirements: 7.2, 7.3
   */
  async updatePriceList(
    priceListId: string,
    data: {
      name?: string;
      description?: string;
      type?: string;
      entityId?: string;
      effectiveFrom?: string;
      effectiveTo?: string;
      isActive?: boolean;
    },
  ) {
    const existing = await this.prisma.priceList.findUnique({
      where: { id: priceListId },
    });

    if (!existing) {
      throw new NotFoundException(`Price list with id '${priceListId}' not found`);
    }

    return this.prisma.priceList.update({
      where: { id: priceListId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.entityId !== undefined && { entityId: data.entityId }),
        ...(data.effectiveFrom !== undefined && {
          effectiveFrom: new Date(data.effectiveFrom),
        }),
        ...(data.effectiveTo !== undefined && {
          effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null,
        }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: { items: true },
    });
  }

  /**
   * Adds an item to a price list.
   * Requirements: 7.1, 7.2
   */
  async addPriceListItem(data: {
    priceListId: string;
    testId: string;
    price: number;
    discount?: number;
  }) {
    // Verify price list exists
    const priceList = await this.prisma.priceList.findUnique({
      where: { id: data.priceListId },
    });

    if (!priceList) {
      throw new NotFoundException(
        `Price list with id '${data.priceListId}' not found`,
      );
    }

    return this.prisma.priceListItem.create({
      data: {
        priceListId: data.priceListId,
        testId: data.testId,
        price: data.price,
        discount: data.discount ?? 0,
      },
    });
  }

  /**
   * Resolves pricing for multiple tests and aggregates totals.
   */
  async resolveOrderTotal(
    testIds: string[],
    context: PricingContext = {},
  ): Promise<{
    items: Array<{ testId: string; pricing: PricingResult }>;
    subtotal: Decimal;
    totalDiscount: Decimal;
    totalAmount: Decimal;
  }> {
    const items: Array<{ testId: string; pricing: PricingResult }> = [];

    for (const testId of testIds) {
      const pricing = await this.resolvePrice(testId, context);
      items.push({ testId, pricing });
    }

    const subtotal = items.reduce(
      (sum, item) => sum.add(item.pricing.basePrice),
      new Decimal(0),
    );
    const totalAmount = items.reduce(
      (sum, item) => sum.add(item.pricing.finalPrice),
      new Decimal(0),
    );
    const totalDiscount = subtotal.sub(totalAmount);

    return {
      items,
      subtotal,
      totalDiscount,
      totalAmount,
    };
  }

  /**
   * Closes overlapping tariff when creating a new one.
   * Sets effectiveTo to newEffectiveFrom - 1 day on any open-ended tariff
   * for the same test-clinic-insurance combination.
   */
  async closeOverlappingTariff(
    testId: string,
    clinicId: string | null,
    insuranceId: string | null,
    newEffectiveFrom: Date,
  ): Promise<void> {
    const closingDate = new Date(newEffectiveFrom);
    closingDate.setDate(closingDate.getDate() - 1);

    await this.prisma.tariff.updateMany({
      where: {
        testId,
        clinicId,
        insuranceId,
        effectiveTo: null,
        effectiveFrom: { lt: newEffectiveFrom },
      },
      data: { effectiveTo: closingDate },
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Attempts to find a matching PriceListItem based on the pricing context.
   * Matches by entity (corporateId, insuranceId) on active price lists within their validity period.
   */
  private async resolvePriceListItem(
    testId: string,
    context: PricingContext,
    asOfDate: Date,
  ) {
    // Build entity conditions for price list matching
    const entityConditions: Array<{ type: string; entityId: string }> = [];

    if (context.corporateId) {
      entityConditions.push({ type: 'CORPORATE', entityId: context.corporateId });
    }
    if (context.insuranceId) {
      entityConditions.push({ type: 'INSURANCE', entityId: context.insuranceId });
    }
    if (context.packageId) {
      entityConditions.push({ type: 'PACKAGE', entityId: context.packageId });
    }

    if (entityConditions.length === 0) {
      return null;
    }

    // Find matching price list items from active, valid price lists
    for (const condition of entityConditions) {
      const priceListItem = await this.prisma.priceListItem.findFirst({
        where: {
          testId,
          priceList: {
            type: condition.type,
            entityId: condition.entityId,
            isActive: true,
            effectiveFrom: { lte: asOfDate },
            OR: [
              { effectiveTo: null },
              { effectiveTo: { gte: asOfDate } },
            ],
          },
        },
        include: { priceList: true },
        orderBy: { priceList: { effectiveFrom: 'desc' } },
      });

      if (priceListItem) {
        return priceListItem;
      }
    }

    return null;
  }

  /**
   * Resolves tariff using priority-based lookup:
   * 1. SPECIFIC: clinic + insurance match
   * 2. CLINIC_ONLY: clinic match, no insurance
   * 3. INSURANCE_ONLY: insurance match, no clinic
   * 4. DEFAULT: no clinic, no insurance
   */
  private async resolveTariff(
    testId: string,
    context: PricingContext,
    asOfDate: Date,
  ): Promise<{
    tariff: { id: string; price: Decimal; discount: Decimal };
    resolution: 'SPECIFIC' | 'CLINIC_ONLY' | 'INSURANCE_ONLY' | 'DEFAULT';
  } | null> {
    const { clinicId, insuranceId } = context;

    const dateFilter = {
      effectiveFrom: { lte: asOfDate },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gte: asOfDate } },
      ],
    };

    const orderByEffective = { effectiveFrom: 'desc' as const };

    // Step 1: Specific (clinic + insurance)
    if (clinicId && insuranceId) {
      const tariff = await this.prisma.tariff.findFirst({
        where: { testId, clinicId, insuranceId, ...dateFilter },
        orderBy: orderByEffective,
      });
      if (tariff) {
        return { tariff, resolution: 'SPECIFIC' };
      }
    }

    // Step 2: Clinic-only
    if (clinicId) {
      const tariff = await this.prisma.tariff.findFirst({
        where: { testId, clinicId, insuranceId: null, ...dateFilter },
        orderBy: orderByEffective,
      });
      if (tariff) {
        return { tariff, resolution: 'CLINIC_ONLY' };
      }
    }

    // Step 3: Insurance-only
    if (insuranceId) {
      const tariff = await this.prisma.tariff.findFirst({
        where: { testId, clinicId: null, insuranceId, ...dateFilter },
        orderBy: orderByEffective,
      });
      if (tariff) {
        return { tariff, resolution: 'INSURANCE_ONLY' };
      }
    }

    // Step 4: Default tariff (no clinic, no insurance)
    const defaultTariff = await this.prisma.tariff.findFirst({
      where: { testId, clinicId: null, insuranceId: null, ...dateFilter },
      orderBy: orderByEffective,
    });
    if (defaultTariff) {
      return { tariff: defaultTariff, resolution: 'DEFAULT' };
    }

    return null;
  }
}
