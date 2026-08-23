import { Injectable } from '@nestjs/common';
import { Flag, Gender, AgeUnit, ResultType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AutoFlaggingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate the flag for a result value based on reference ranges.
   * Supports both numeric (ReferenceValue) and qualitative (QualitativeReferenceValue) tests.
   *
   * Priority order for NUMERIC:
   * 1. CRITICAL (value < criticalMin or value > criticalMax)
   * 2. LOW (value < minRef)
   * 3. HIGH (value > maxRef)
   * 4. NORMAL (within range)
   *
   * For QUALITATIVE: looks up QualitativeReferenceValue by optionValue.
   */
  async calculateFlag(
    resultValue: number | string,
    testId: string,
    patientAge: number,
    patientGender: Gender,
  ): Promise<Flag | null> {
    // Check if test is qualitative
    const test = await this.prisma.testMaster.findUnique({
      where: { id: testId },
      select: { resultType: true },
    });

    if (test?.resultType === ResultType.QUALITATIVE) {
      return this.calculateQualitativeFlag(String(resultValue), testId);
    }

    // Numeric flagging
    const numericValue = typeof resultValue === 'number' ? resultValue : parseFloat(String(resultValue));
    if (isNaN(numericValue)) {
      return null;
    }

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
      numericValue < Number(reference.criticalMin)
    ) {
      return Flag.CRITICAL;
    }

    if (
      reference.criticalMax !== null &&
      numericValue > Number(reference.criticalMax)
    ) {
      return Flag.CRITICAL;
    }

    // Then LOW/HIGH
    if (numericValue < Number(reference.minRef)) {
      return Flag.LOW;
    }

    if (numericValue > Number(reference.maxRef)) {
      return Flag.HIGH;
    }

    // Within normal range
    return Flag.NORMAL;
  }

  /**
   * Calculate flag for a qualitative test result by looking up QualitativeReferenceValue.
   * Returns null if no mapping is found (test has no qualitative reference configured).
   */
  private async calculateQualitativeFlag(
    resultValue: string,
    testId: string,
  ): Promise<Flag | null> {
    const qualRef = await this.prisma.qualitativeReferenceValue.findUnique({
      where: {
        testId_optionValue: {
          testId,
          optionValue: resultValue.trim(),
        },
      },
    });

    if (!qualRef) {
      // Try case-insensitive match as fallback
      const allRefs = await this.prisma.qualitativeReferenceValue.findMany({
        where: { testId },
      });
      const match = allRefs.find(
        (r) => r.optionValue.toLowerCase() === resultValue.trim().toLowerCase(),
      );
      return match?.flag ?? null;
    }

    return qualRef.flag;
  }

  /**
   * Resolve the appropriate reference value for a test based on patient demographics.
   * BP-MD-04: Supports ageUnit (YEARS/MONTHS/DAYS) for neonatal/pediatric precision.
   *
   * Resolution strategy:
   * 1. Convert patient age (in years) to all units for comparison
   * 2. Query ReferenceValue by testId where patient age is within range (per ageUnit)
   * 3. Prefer most specific match (DAYS > MONTHS > YEARS) then gender-specific
   * 4. If no match found, return null
   */
  private async resolveReference(
    testId: string,
    patientAgeYears: number,
    patientGender: Gender,
  ) {
    // Convert patient age to all units for lookup
    const ageInDays = Math.round(patientAgeYears * 365.25);
    const ageInMonths = Math.round(patientAgeYears * 12);
    const ageInYears = Math.floor(patientAgeYears);

    // Fetch all reference values for this test
    const allRefs = await this.prisma.referenceValue.findMany({
      where: { testId },
    });

    if (allRefs.length === 0) {
      return null;
    }

    // Filter refs that match patient age per their ageUnit
    const matchingRefs = allRefs.filter((ref) => {
      let patientAgeInUnit: number;
      switch (ref.ageUnit) {
        case AgeUnit.DAYS:
          patientAgeInUnit = ageInDays;
          break;
        case AgeUnit.MONTHS:
          patientAgeInUnit = ageInMonths;
          break;
        case AgeUnit.YEARS:
        default:
          patientAgeInUnit = ageInYears;
          break;
      }
      return patientAgeInUnit >= ref.minAge && patientAgeInUnit <= ref.maxAge;
    });

    if (matchingRefs.length === 0) {
      return null;
    }

    // Prefer most precise ageUnit: DAYS > MONTHS > YEARS
    const priorityOrder = [AgeUnit.DAYS, AgeUnit.MONTHS, AgeUnit.YEARS];

    for (const unit of priorityOrder) {
      const unitRefs = matchingRefs.filter((r) => r.ageUnit === unit);
      if (unitRefs.length === 0) continue;

      // Within this unit, prefer gender-specific
      const genderSpecific = unitRefs.find((r) => r.gender === patientGender);
      if (genderSpecific) return genderSpecific;

      // Fallback to first match in this unit
      return unitRefs[0];
    }

    // Should not reach here, but just in case
    return matchingRefs[0];
  }
}
