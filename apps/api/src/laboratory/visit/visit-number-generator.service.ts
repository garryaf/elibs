import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class VisitNumberGeneratorService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a unique visit number in format VST-YYYYMM-XXXX
   * Uses SERIALIZABLE transaction isolation for concurrency safety.
   * Retries once on serialization failure (P0001).
   */
  async generate(): Promise<string> {
    try {
      return await this.generateWithTransaction();
    } catch (error) {
      // Retry once on serialization failure (PostgreSQL error code P0001 / 40001)
      if (this.isSerializationError(error)) {
        return await this.generateWithTransaction();
      }
      throw error;
    }
  }

  private async generateWithTransaction(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const monthKey = `${year}${month}`;

    const result = await this.prisma.$transaction(
      async (tx) => {
        // UPSERT: insert with lastValue=1 or increment existing lastValue atomically
        await tx.$executeRaw`
          INSERT INTO visit_sequences (id, "lastValue")
          VALUES (${monthKey}, 1)
          ON CONFLICT (id) DO UPDATE
          SET "lastValue" = visit_sequences."lastValue" + 1
        `;

        const sequence = await tx.visitSequence.findUniqueOrThrow({
          where: { id: monthKey },
        });

        return sequence.lastValue;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    if (result > 9999) {
      throw new InternalServerErrorException({
        errorCode: 'ERR_INTERNAL',
        message: 'Monthly visit number capacity (9999) exceeded',
      });
    }

    return VisitNumberGeneratorService.format(year, month, result);
  }

  private isSerializationError(error: unknown): boolean {
    if (error && typeof error === 'object') {
      const err = error as { code?: string; meta?: { code?: string } };
      // Prisma wraps PostgreSQL errors — check both the Prisma error code and the underlying PG code
      if (err.code === 'P2034') return true; // Prisma's serialization failure code
      if (err.meta?.code === '40001') return true; // PostgreSQL serialization failure
    }
    return false;
  }

  /**
   * Parses a visit number into its components.
   * Returns null if the format is invalid.
   */
  static parse(
    visitNumber: string,
  ): { year: string; month: string; sequence: number } | null {
    const match = visitNumber.match(/^VST-(\d{4})(\d{2})-(\d{4})$/);
    if (!match) return null;
    return {
      year: match[1],
      month: match[2],
      sequence: parseInt(match[3], 10),
    };
  }

  /**
   * Formats components back into a visit number string.
   */
  static format(year: string, month: string, sequence: number): string {
    return `VST-${year}${month}-${sequence.toString().padStart(4, '0')}`;
  }
}
