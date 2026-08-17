import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import {
  evaluateWestgardRules,
  QCResultData,
  WestgardResult,
} from './westgard.engine';
import { CreateQCSampleDto, RecordQCRunDto } from './dto';

@Injectable()
export class QCService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new QC sample record.
   * QC samples are control materials run alongside patient samples to verify
   * analyzer accuracy.
   */
  async createQCSample(dto: CreateQCSampleDto) {
    return this.prisma.qCSample.create({
      data: {
        name: dto.name,
        lotNumber: dto.lotNumber,
        manufacturer: dto.manufacturer ?? null,
        level: dto.level,
        expiryDate: new Date(dto.expiryDate),
      },
    });
  }

  /**
   * Record a QC run with results.
   * For each result, calculates the zScore ((value - expectedMean) / expectedSD),
   * evaluates Westgard rules, and stores pass/fail status per result.
   */
  async recordQCRun(dto: RecordQCRunDto, userId: string) {
    const qcSample = await this.prisma.qCSample.findUnique({
      where: { id: dto.qcSampleId },
    });

    if (!qcSample) {
      throw new NotFoundException('QC sample not found');
    }

    // Create the QC run and all results in a transaction
    const qcRun = await this.prisma.$transaction(async (tx) => {
      const run = await tx.qCRun.create({
        data: {
          qcSampleId: dto.qcSampleId,
          testId: dto.testId,
          equipmentId: dto.equipmentId ?? null,
          performedBy: userId,
          notes: dto.notes ?? null,
        },
      });

      // Get recent QC results for Westgard evaluation context
      const recentResults = await tx.qCResult.findMany({
        where: {
          qcRun: {
            qcSampleId: dto.qcSampleId,
            testId: dto.testId,
          },
        },
        orderBy: { qcRun: { runDate: 'asc' } },
        take: 19, // Leave room for current results
      });

      // Process each result: calculate zScore and evaluate Westgard
      const resultRecords = [];
      for (const result of dto.results) {
        const zScore =
          result.expectedSD !== 0
            ? (result.resultValue - result.expectedMean) / result.expectedSD
            : 0;

        // Build the full result history including this new value
        const allResults: QCResultData[] = [
          ...recentResults.map((r) => ({ value: Number(r.resultValue) })),
          ...resultRecords.map((r) => ({ value: Number(r.resultValue) })),
          { value: result.resultValue },
        ];

        const westgardResult = evaluateWestgardRules(
          allResults,
          result.expectedMean,
          result.expectedSD,
        );

        // Determine the first violated rejection rule (if any)
        const rejectionViolation = westgardResult.violations.find(
          (v) => v.rule !== '1-2s',
        );

        const qcResult = await tx.qCResult.create({
          data: {
            qcRunId: run.id,
            resultValue: new Decimal(result.resultValue.toFixed(4)),
            expectedMean: new Decimal(result.expectedMean.toFixed(4)),
            expectedSD: new Decimal(result.expectedSD.toFixed(4)),
            zScore: new Decimal(zScore.toFixed(3)),
            westgardPass: westgardResult.passed,
            violatedRule: rejectionViolation?.rule ?? null,
          },
        });

        resultRecords.push(qcResult);
      }

      return { ...run, results: resultRecords };
    });

    return qcRun;
  }

  /**
   * Evaluate Westgard rules for a given QC sample and test combination.
   * Queries recent QC results and runs the Westgard multi-rule engine.
   */
  async evaluateWestgard(
    qcSampleId: string,
    testId: string,
  ): Promise<WestgardResult> {
    // Get recent QC results for this sample+test combination
    const recentResults = await this.prisma.qCResult.findMany({
      where: {
        qcRun: {
          qcSampleId,
          testId,
        },
      },
      orderBy: { qcRun: { runDate: 'asc' } },
      take: 20, // Last 20 results for comprehensive evaluation
    });

    if (recentResults.length === 0) {
      return { passed: true, violations: [] };
    }

    // Use the expected mean and SD from the most recent result
    const latestResult = recentResults[recentResults.length - 1];
    const mean = Number(latestResult.expectedMean);
    const sd = Number(latestResult.expectedSD);

    const resultData: QCResultData[] = recentResults.map((r) => ({
      value: Number(r.resultValue),
    }));

    return evaluateWestgardRules(resultData, mean, sd);
  }

  /**
   * Get Levey-Jennings chart data for a QC sample.
   * Returns time-series QC results with control limits for charting.
   *
   * @param qcSampleId - The QC sample to get chart data for
   * @param testId - Optional filter by test
   */
  async getLeveyJenningsData(qcSampleId: string, testId?: string) {
    const qcSample = await this.prisma.qCSample.findUnique({
      where: { id: qcSampleId },
    });

    if (!qcSample) {
      throw new NotFoundException('QC sample not found');
    }

    const whereClause: Record<string, unknown> = { qcSampleId };
    if (testId) {
      whereClause.testId = testId;
    }

    const runs = await this.prisma.qCRun.findMany({
      where: whereClause,
      orderBy: { runDate: 'asc' },
      include: {
        results: true,
      },
    });

    // Transform into Levey-Jennings chart format
    const dataPoints = runs.flatMap((run) =>
      run.results.map((result) => ({
        runId: run.id,
        runDate: run.runDate,
        resultValue: Number(result.resultValue),
        expectedMean: Number(result.expectedMean),
        expectedSD: Number(result.expectedSD),
        zScore: Number(result.zScore),
        westgardPass: result.westgardPass,
        violatedRule: result.violatedRule,
        // Control limits
        plus1SD: Number(result.expectedMean) + Number(result.expectedSD),
        plus2SD: Number(result.expectedMean) + 2 * Number(result.expectedSD),
        plus3SD: Number(result.expectedMean) + 3 * Number(result.expectedSD),
        minus1SD: Number(result.expectedMean) - Number(result.expectedSD),
        minus2SD: Number(result.expectedMean) - 2 * Number(result.expectedSD),
        minus3SD: Number(result.expectedMean) - 3 * Number(result.expectedSD),
      })),
    );

    return {
      qcSample: {
        id: qcSample.id,
        name: qcSample.name,
        lotNumber: qcSample.lotNumber,
        level: qcSample.level,
      },
      totalPoints: dataPoints.length,
      dataPoints,
    };
  }

  /**
   * Get current QC status for a specific test.
   * Returns the latest QC run result and Westgard evaluation.
   */
  async getQCStatus(testId: string) {
    const latestRun = await this.prisma.qCRun.findFirst({
      where: { testId },
      orderBy: { runDate: 'desc' },
      include: {
        results: true,
        qcSample: {
          select: { id: true, name: true, lotNumber: true, level: true },
        },
      },
    });

    if (!latestRun) {
      return {
        testId,
        status: 'NO_DATA',
        message: 'No QC runs recorded for this test',
        lastRunDate: null,
        isValid: true,
      };
    }

    const hasFailure = latestRun.results.some(
      (result) => !result.westgardPass,
    );

    const violations = latestRun.results
      .filter((r) => !r.westgardPass && r.violatedRule)
      .map((r) => r.violatedRule);

    return {
      testId,
      status: hasFailure ? 'FAILED' : 'PASSED',
      isValid: !hasFailure,
      lastRunDate: latestRun.runDate,
      lastRunId: latestRun.id,
      qcSample: latestRun.qcSample,
      violations,
      resultCount: latestRun.results.length,
    };
  }

  /**
   * Get QC dashboard overview data.
   * Aggregates QC status across all active samples and tests.
   */
  async getDashboardData() {
    // Get all active QC samples
    const activeSamples = await this.prisma.qCSample.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        lotNumber: true,
        level: true,
        expiryDate: true,
        runs: {
          orderBy: { runDate: 'desc' },
          take: 1,
          include: {
            results: true,
          },
        },
      },
    });

    // Get recent QC runs (last 24 hours)
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentRuns = await this.prisma.qCRun.findMany({
      where: { runDate: { gte: last24h } },
      include: {
        results: true,
        qcSample: { select: { name: true } },
      },
      orderBy: { runDate: 'desc' },
    });

    // Compute summary statistics
    const totalSamples = activeSamples.length;
    const samplesWithFailures = activeSamples.filter((sample) =>
      sample.runs.some((run) =>
        run.results.some((result) => !result.westgardPass),
      ),
    ).length;

    const recentRunsTotal = recentRuns.length;
    const recentRunsFailed = recentRuns.filter((run) =>
      run.results.some((result) => !result.westgardPass),
    ).length;

    // Expiring soon (within 30 days)
    const thirtyDaysFromNow = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    );
    const expiringSoon = activeSamples.filter(
      (sample) => sample.expiryDate <= thirtyDaysFromNow,
    );

    return {
      summary: {
        totalActiveSamples: totalSamples,
        samplesWithFailures,
        samplesPassingAll: totalSamples - samplesWithFailures,
        recentRunsTotal,
        recentRunsFailed,
        recentRunsPassed: recentRunsTotal - recentRunsFailed,
      },
      expiringSamples: expiringSoon.map((s) => ({
        id: s.id,
        name: s.name,
        lotNumber: s.lotNumber,
        expiryDate: s.expiryDate,
      })),
      recentFailures: recentRuns
        .filter((run) => run.results.some((r) => !r.westgardPass))
        .slice(0, 10)
        .map((run) => ({
          runId: run.id,
          runDate: run.runDate,
          sampleName: run.qcSample.name,
          violations: run.results
            .filter((r) => !r.westgardPass && r.violatedRule)
            .map((r) => r.violatedRule),
        })),
    };
  }

  /**
   * Check if the most recent QC run for a given test passed Westgard rules.
   * Used by VerificationService to block verification when QC fails.
   *
   * @param testId - The test to check QC validity for
   * @param analyzerId - Optional analyzer/equipment ID to scope the check
   * @returns true if QC is valid (passed), false if QC has violations that block verification
   */
  async isQCValid(testId: string, analyzerId?: string): Promise<boolean> {
    // Find the most recent QC run for this test (optionally scoped to analyzer)
    const whereClause: Record<string, unknown> = { testId };
    if (analyzerId) {
      whereClause.equipmentId = analyzerId;
    }

    const latestRun = await this.prisma.qCRun.findFirst({
      where: whereClause,
      orderBy: { runDate: 'desc' },
      include: {
        results: true,
      },
    });

    // If no QC run exists for this test, consider QC as valid
    // (no QC data means no violations to block on)
    if (!latestRun) {
      return true;
    }

    // If any result in the latest run failed Westgard rules, QC is invalid
    const hasFailure = latestRun.results.some(
      (result) => !result.westgardPass,
    );

    return !hasFailure;
  }
}
