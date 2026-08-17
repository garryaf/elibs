import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  ReconcilePaymentsDto,
  ReconcileItemDto,
  ReconciliationStatus,
} from './dto/reconcile-payment.dto';

export interface ReconciliationResult {
  totalProcessed: number;
  matched: number;
  unmatched: number;
  pending: number;
  errors: { paymentComponentId: string; message: string }[];
}

@Injectable()
export class ReconciliationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async reconcilePayments(
    dto: ReconcilePaymentsDto,
    userId: string,
  ): Promise<ReconciliationResult> {
    const result: ReconciliationResult = {
      totalProcessed: dto.items.length,
      matched: 0,
      unmatched: 0,
      pending: 0,
      errors: [],
    };

    // Validate all payment component IDs exist upfront
    const ids = dto.items.map((item) => item.paymentComponentId);
    const existingComponents = await this.prisma.paymentComponent.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });

    const existingIds = new Set(existingComponents.map((c) => c.id));
    const validItems: ReconcileItemDto[] = [];

    for (const item of dto.items) {
      if (!existingIds.has(item.paymentComponentId)) {
        result.errors.push({
          paymentComponentId: item.paymentComponentId,
          message: 'Payment component not found',
        });
      } else {
        validItems.push(item);
      }
    }

    if (validItems.length === 0 && result.errors.length > 0) {
      throw new BadRequestException({
        errorCode: 'ERR_RECONCILIATION_FAILED',
        message: 'No valid payment components found for reconciliation',
        details: { errors: result.errors },
      });
    }

    // Process valid items in a single transaction
    await this.prisma.$transaction(async (tx) => {
      for (const item of validItems) {
        const reconciledAt =
          item.reconciliationStatus === ReconciliationStatus.MATCHED
            ? new Date()
            : null;

        await tx.paymentComponent.update({
          where: { id: item.paymentComponentId },
          data: {
            reconciliationStatus: item.reconciliationStatus,
            reconciledAt,
            reconciliationRef: item.reconciliationRef || null,
          },
        });

        // Track counts
        switch (item.reconciliationStatus) {
          case ReconciliationStatus.MATCHED:
            result.matched++;
            break;
          case ReconciliationStatus.UNMATCHED:
            result.unmatched++;
            break;
          case ReconciliationStatus.PENDING:
            result.pending++;
            break;
        }
      }
    });

    // Audit log the batch reconciliation
    await this.auditService.log(
      userId,
      'PAYMENT_RECONCILIATION',
      'PaymentComponent',
      'batch',
      null,
      {
        totalProcessed: result.totalProcessed,
        matched: result.matched,
        unmatched: result.unmatched,
        pending: result.pending,
        errors: result.errors.length,
        componentIds: validItems.map((i) => i.paymentComponentId),
      },
      null,
    );

    return result;
  }
}
