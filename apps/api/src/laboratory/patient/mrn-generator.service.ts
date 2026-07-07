import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class MrnGeneratorService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const monthKey = `${year}${month}`;

    const result = await this.prisma.$transaction(
      async (tx) => {
        // UPSERT: insert or increment lastValue atomically
        await tx.$executeRaw`
          INSERT INTO mrn_sequences (id, "lastValue")
          VALUES (${monthKey}, 1)
          ON CONFLICT (id) DO UPDATE
          SET "lastValue" = mrn_sequences."lastValue" + 1
        `;

        const sequence = await tx.mrnSequence.findUniqueOrThrow({
          where: { id: monthKey },
        });

        return sequence.lastValue;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    const paddedValue = result.toString().padStart(4, '0');
    return `RM-${monthKey}-${paddedValue}`;
  }
}
