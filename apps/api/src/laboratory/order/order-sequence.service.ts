import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class OrderSequenceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a unique order number in format LAB-YYYYMM-XXXX
   * Uses SERIALIZABLE transaction isolation for concurrency safety.
   * Retries on serialization failure (P2034 / 40001).
   */
  async generateOrderNumber(): Promise<string> {
    try {
      return await this.generateWithTransaction();
    } catch (error) {
      // Retry once on serialization failure
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
          INSERT INTO order_sequences (id, "lastValue")
          VALUES (${monthKey}, 1)
          ON CONFLICT (id) DO UPDATE
          SET "lastValue" = order_sequences."lastValue" + 1
        `;

        const sequence = await tx.orderSequence.findUniqueOrThrow({
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
        message: 'Monthly order number capacity (9999) exceeded',
      });
    }

    return OrderSequenceService.format(monthKey, result);
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
   * Parses an order number into its components.
   * Returns null if the format is invalid.
   */
  static parse(
    orderNumber: string,
  ): { monthKey: string; sequence: number } | null {
    const match = orderNumber.match(/^LAB-(\d{6})-(\d{4})$/);
    if (!match) return null;
    return {
      monthKey: match[1],
      sequence: parseInt(match[2], 10),
    };
  }

  /**
   * Formats components into an order number string.
   */
  static format(monthKey: string, sequence: number): string {
    return `LAB-${monthKey}-${sequence.toString().padStart(4, '0')}`;
  }
}
