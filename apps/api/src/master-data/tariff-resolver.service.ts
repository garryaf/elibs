import { Injectable } from '@nestjs/common';
import { Tariff } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class TariffResolverService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get the active tariff for a given test, optionally scoped by clinic/insurance.
   * Returns the most recently effective tariff where effectiveFrom <= referenceDate
   * and effectiveTo is null or >= referenceDate.
   */
  async getActiveTariff(
    testId: string,
    clinicId?: string,
    insuranceId?: string,
    asOfDate?: Date,
  ): Promise<Tariff | null> {
    const referenceDate = asOfDate ?? new Date();

    return this.prisma.tariff.findFirst({
      where: {
        testId,
        clinicId: clinicId ?? null,
        insuranceId: insuranceId ?? null,
        effectiveFrom: { lte: referenceDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: referenceDate } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  /**
   * Close overlapping tariff when creating a new one.
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
}
