import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ReceiptSequenceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a unique receipt number in format RCP-YYYYMMDD-XXXX
   * Uses SERIALIZABLE transaction isolation for concurrency safety.
   * Retries on serialization failure (P2034 / 40001).
   */
  async generateReceiptNumber(): Promise<string> {
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

  /**
   * Persists a receipt number to the Order record.
   */
  async persistReceipt(orderId: string, receiptNumber: string): Promise<void> {
    await this.prisma.order.update({
      where: { id: orderId },
      data: { receiptNumber },
    });
  }

  private async generateWithTransaction(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const dateKey = `${year}${month}${day}`;

    const result = await this.prisma.$transaction(
      async (tx) => {
        // UPSERT: insert with lastValue=1 or increment existing lastValue atomically
        await tx.$executeRaw`
          INSERT INTO receipt_sequences (id, "lastValue")
          VALUES (${dateKey}, 1)
          ON CONFLICT (id) DO UPDATE
          SET "lastValue" = receipt_sequences."lastValue" + 1
        `;

        const sequence = await tx.receiptSequence.findUniqueOrThrow({
          where: { id: dateKey },
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
        message: 'Daily receipt number capacity (9999) exceeded',
      });
    }

    return ReceiptSequenceService.format(dateKey, result);
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
   * Parses a receipt number into its components.
   * Returns null if the format is invalid.
   */
  static parse(
    receiptNumber: string,
  ): { dateKey: string; sequence: number } | null {
    const match = receiptNumber.match(/^RCP-(\d{8})-(\d{4})$/);
    if (!match) return null;
    return {
      dateKey: match[1],
      sequence: parseInt(match[2], 10),
    };
  }

  /**
   * Formats components into a receipt number string.
   */
  static format(dateKey: string, sequence: number): string {
    return `RCP-${dateKey}-${sequence.toString().padStart(4, '0')}`;
  }
}
