import { Injectable, Logger } from '@nestjs/common';
import {
  Order,
  OrderDetail,
  Patient,
  TestMaster,
  ReferenceValue,
} from '@prisma/client';

export interface OrderWithDetails extends Order {
  patient: Patient;
  orderDetails: (OrderDetail & {
    test: TestMaster & { referenceValues: ReferenceValue[] };
  })[];
}

@Injectable()
export class PdfGeneratorService {
  private readonly logger = new Logger(PdfGeneratorService.name);

  /**
   * Generates a PDF report for a completed laboratory order.
   * Currently a stub that generates a text-based representation as a Buffer.
   * In production, this would use a PDF library (e.g., pdfkit, puppeteer).
   */
  async generateReport(order: OrderWithDetails): Promise<Buffer> {
    this.logger.log(`Generating PDF report for order ${order.orderNumber}`);

    const reportContent = this.buildReportContent(order);
    return Buffer.from(reportContent, 'utf-8');
  }

  private buildReportContent(order: OrderWithDetails): string {
    const lines: string[] = [];

    lines.push('='.repeat(60));
    lines.push('LABORATORY REPORT');
    lines.push('='.repeat(60));
    lines.push('');
    lines.push(`Patient Name   : ${order.patient.name}`);
    lines.push(`MRN            : ${order.patient.mrn}`);
    lines.push(`Date of Birth  : ${order.patient.dateOfBirth.toISOString().split('T')[0]}`);
    lines.push(`Gender         : ${order.patient.gender}`);
    lines.push('');
    lines.push(`Order Number   : ${order.orderNumber}`);
    lines.push(`Order Date     : ${order.createdAt.toISOString()}`);
    lines.push(`Approved At    : ${order.approvedAt?.toISOString() ?? 'N/A'}`);
    lines.push(`Approved By    : ${order.approvedBy ?? 'N/A'}`);
    lines.push('');

    if (order.interpretation) {
      lines.push(`Interpretation : ${order.interpretation}`);
      lines.push('');
    }

    lines.push('-'.repeat(60));
    lines.push('TEST RESULTS');
    lines.push('-'.repeat(60));
    lines.push('');

    for (const detail of order.orderDetails) {
      lines.push(`Test: ${detail.test.name} (${detail.test.code})`);
      lines.push(`  Result  : ${detail.resultValue ?? 'N/A'}`);
      lines.push(`  Flag    : ${detail.flag ?? 'N/A'}`);
      lines.push(`  Unit    : ${detail.test.unit ?? 'N/A'}`);

      if (detail.test.referenceValues.length > 0) {
        const ref = detail.test.referenceValues[0];
        lines.push(`  Ref Range: ${ref.minRef} - ${ref.maxRef}`);
        if (ref.criticalMin || ref.criticalMax) {
          lines.push(
            `  Critical : ${ref.criticalMin ?? 'N/A'} - ${ref.criticalMax ?? 'N/A'}`,
          );
        }
      }

      if (detail.comment) {
        lines.push(`  Comment : ${detail.comment}`);
      }
      lines.push('');
    }

    lines.push('='.repeat(60));
    lines.push('END OF REPORT');
    lines.push('='.repeat(60));

    return lines.join('\n');
  }
}
