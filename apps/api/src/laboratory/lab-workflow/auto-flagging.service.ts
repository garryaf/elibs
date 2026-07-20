import { Injectable } from '@nestjs/common';
import { Flag, Gender } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AutoFlaggingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate the flag for a result value based on reference ranges.
   * Returns null for qualitative tests (no reference range found).
   *
   * Priority order:
   * 1. CRITICAL (value < criticalMin or value > criticalMax)
   * 2. LOW (value < minRef)
   * 3. HIGH (value > maxRef)
   * 4. NORMAL (within range)
   */
  async calculateFlag(
    resultValue: number,
    testId: string,
    patientAge: number,
    patientGender: Gender,
  ): Promise<Flag | null> {
    const reference = await this.resolveReference(
      testId,
      patientAge,
      patientGender,
    );

    if (!reference) {
      return null;
    }

    // Priority: CRITICAL checks first
    if (
      reference.criticalMin !== null &&
      resultValue < Number(reference.criticalMin)
    ) {
      return Flag.CRITICAL;
    }

    if (
      reference.criticalMax !== null &&
      resultValue > Number(reference.criticalMax)
    ) {
      return Flag.CRITICAL;
    }

    // Then LOW/HIGH
    if (resultValue < Number(reference.minRef)) {
      return Flag.LOW;
    }

    if (resultValue > Number(reference.maxRef)) {
      return Flag.HIGH;
    }

    // Within normal range
    return Flag.NORMAL;
  }

  /**
   * Resolve the appropriate reference value for a test based on patient demographics.
   *
   * Resolution strategy:
   * 1. Query ReferenceValue by testId where patient age is within minAge-maxAge range
   * 2. Prefer gender-specific match over any other match
   * 3. If no match found, return null (qualitative test — no flag assigned)
   */
  private async resolveReference(
    testId: string,
    patientAge: number,
    patientGender: Gender,
  ) {
    const refs = await this.prisma.referenceValue.findMany({
      where: {
        testId,
        minAge: { lte: patientAge },
        maxAge: { gte: patientAge },
      },
    });

    if (refs.length === 0) {
      return null;
    }

    // Prefer gender-specific match
    const genderSpecific = refs.find((r) => r.gender === patientGender);
    if (genderSpecific) {
      return genderSpecific;
    }

    // Fallback to gender-neutral references only (gender = null)
    const genderNeutral = refs.find((r) => r.gender === null);
    return genderNeutral ?? null;
  }
}
