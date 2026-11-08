import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PdfGeneratorService, OrderWithDetails } from './pdf-generator.service';

export interface PdfGenerationJobData {
  orderId: string;
  version: number;
  /** When true, increments Order.reportVersion before generating */
  incrementVersion?: boolean;
}

export interface PdfGenerationResult {
  orderId: string;
  version: number;
  pdfBase64: string;
  generatedAt: string;
  byteLength: number;
}

/**
 * BullMQ Processor for async PDF report generation using pdfkit.
 * Uses the `lab-pdf-generation` queue (registered in NotificationModule).
 *
 * Responsibilities:
 * 1. Fetch order data (patient, test results, flags, reference ranges, addendums)
 * 2. Optionally increment reportVersion for regeneration scenarios
 * 3. Generate PDF with proper headers, tables, reference ranges, flag indicators
 * 4. Include report version in footer
 * 5. Return base64-encoded PDF for caching by PdfReportCacheService
 *
 * Concurrency: 3 (handles up to 3 concurrent PDF generations)
 * Retries: 3 with exponential backoff starting at 1s
 *
 * Requirements: 11.1, 11.2
 */
@Processor('lab-pdf-generation', { concurrency: 3 })
@Injectable()
export class PdfReportProcessor extends WorkerHost {
  private readonly logger = new Logger(PdfReportProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfGeneratorService: PdfGeneratorService,
  ) {
    super();
  }

  async process(job: Job<PdfGenerationJobData>): Promise<PdfGenerationResult> {
    const { orderId, version, incrementVersion } = job.data;

    this.logger.log(
      `Processing PDF generation for order ${orderId}, version ${version}`,
    );

    // If this is a regeneration (e.g., post-amendment), increment reportVersion
    let effectiveVersion = version;
    if (incrementVersion) {
      const updated = await this.prisma.order.update({
        where: { id: orderId },
        data: { reportVersion: { increment: 1 } },
        select: { reportVersion: true },
      });
      effectiveVersion = updated.reportVersion;
      this.logger.log(
        `Incremented report version for order ${orderId} to v${effectiveVersion}`,
      );
    }

    // Fetch order with all relations needed for PDF generation
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        patient: true,
        clinic: true,
        doctor: true,
        orderDetails: {
          include: {
            test: {
              include: {
                referenceValues: true,
              },
            },
          },
        },
        addendums: {
          orderBy: { version: 'asc' },
        },
      },
    });

    if (!order) {
      this.logger.error(`Order ${orderId} not found for PDF generation`);
      throw new Error(`Order ${orderId} not found`);
    }

    // Generate the PDF using pdfkit-based PdfGeneratorService
    // Includes: clinic header, patient info, results table with reference ranges
    // and flag indicators (H/L/C!), addendums, and report version in footer
    const pdfBuffer = await this.pdfGeneratorService.generateReport(order);

    const pdfBase64 = pdfBuffer.toString('base64');

    this.logger.log(
      `PDF generated successfully for order ${order.orderNumber} v${effectiveVersion} (${pdfBuffer.length} bytes)`,
    );

    return {
      orderId,
      version: effectiveVersion,
      pdfBase64,
      generatedAt: new Date().toISOString(),
      byteLength: pdfBuffer.length,
    };
  }
}
