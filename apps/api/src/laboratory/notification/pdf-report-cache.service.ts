import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PdfGeneratorService, OrderWithDetails } from './pdf-generator.service';
import { PdfGenerationJobData, PdfGenerationResult } from './pdf-report.processor';

/**
 * Service responsible for managing PDF report caching and on-demand generation.
 *
 * Strategy:
 * - First request: generates PDF synchronously (fast path for single report)
 * - Stores base64 in an in-memory Map keyed by `{orderId}:v{version}`
 * - Subsequent requests serve from cache if version matches
 * - If version changes (post-amendment), cache is invalidated
 * - Bulk/background generation goes through the BullMQ queue with version increment
 * - Processor results are automatically cached via cacheResult()
 *
 * Requirements: 11.1, 11.2, 11.4
 */
@Injectable()
export class PdfReportCacheService {
  private readonly logger = new Logger(PdfReportCacheService.name);

  // Simple in-process cache for generated PDFs
  // Key: `{orderId}:v{version}`, Value: base64 string
  private readonly pdfCache = new Map<string, string>();

  // Maximum cache entries to prevent memory overflow
  private readonly MAX_CACHE_SIZE = 200;

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfGeneratorService: PdfGeneratorService,
    @InjectQueue('lab-pdf-generation')
    private readonly pdfQueue: Queue<PdfGenerationJobData>,
  ) {}

  /**
   * Get or generate a PDF report for the given order.
   * Returns the PDF buffer immediately (generates on-demand if not cached).
   */
  async getOrGeneratePdf(orderId: string): Promise<{ buffer: Buffer; orderNumber: string; version: number }> {
    // Fetch order to get current version
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNumber: true, reportVersion: true },
    });

    if (!order) {
      throw new NotFoundException('Order tidak ditemukan');
    }

    const version = order.reportVersion ?? 1;
    const cacheKey = `${orderId}:v${version}`;

    // Check cache
    const cached = this.pdfCache.get(cacheKey);
    if (cached) {
      this.logger.debug(`Serving cached PDF for order ${order.orderNumber} v${version}`);
      return {
        buffer: Buffer.from(cached, 'base64'),
        orderNumber: order.orderNumber,
        version,
      };
    }

    // Generate on-demand (synchronous fast path)
    this.logger.log(`Generating PDF on-demand for order ${order.orderNumber} v${version}`);

    const fullOrder = await this.prisma.order.findUnique({
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

    if (!fullOrder) {
      throw new NotFoundException('Order tidak ditemukan');
    }

    // BE-4: Fetch lab accreditation number from system settings if configured
    const accreditationSetting = await this.prisma.systemSetting.findUnique({
      where: { key: 'lab_accreditation_number' },
    });

    const pdfBuffer = await this.pdfGeneratorService.generateReport(
      fullOrder as unknown as OrderWithDetails,
      { accreditationNumber: accreditationSetting?.value },
    );

    // Store in cache
    this.setCacheEntry(cacheKey, pdfBuffer.toString('base64'));

    return {
      buffer: pdfBuffer,
      orderNumber: order.orderNumber,
      version,
    };
  }

  /**
   * Enqueue async PDF generation via BullMQ.
   * Used for batch generation or background pre-generation.
   */
  async enqueueGeneration(orderId: string): Promise<Job<PdfGenerationJobData>> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { reportVersion: true },
    });

    const version = order?.reportVersion ?? 1;

    const job = await this.pdfQueue.add(
      'generate-pdf',
      { orderId, version },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 50,
        removeOnFail: 20,
      },
    );

    this.logger.log(`Enqueued PDF generation job ${job.id} for order ${orderId}`);
    return job;
  }

  /**
   * Enqueue PDF regeneration with version increment.
   * Used when report content changes (e.g., after addendum, correction).
   * Invalidates existing cache and increments Order.reportVersion.
   */
  async enqueueRegeneration(orderId: string): Promise<Job<PdfGenerationJobData>> {
    // Invalidate existing cache entries for this order
    this.invalidateCache(orderId);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { reportVersion: true },
    });

    const currentVersion = order?.reportVersion ?? 1;

    const job = await this.pdfQueue.add(
      'generate-pdf',
      { orderId, version: currentVersion, incrementVersion: true },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 50,
        removeOnFail: 20,
      },
    );

    this.logger.log(
      `Enqueued PDF regeneration job ${job.id} for order ${orderId} (will increment from v${currentVersion})`,
    );
    return job;
  }

  /**
   * Called when a PDF generation job completes (from processor).
   * Updates the cache with the generated result.
   */
  cacheResult(result: PdfGenerationResult): void {
    const cacheKey = `${result.orderId}:v${result.version}`;
    this.setCacheEntry(cacheKey, result.pdfBase64);
    this.logger.debug(
      `Cached PDF result for order ${result.orderId} v${result.version} (${result.byteLength} bytes)`,
    );
  }

  /**
   * Invalidate cache for an order (e.g., when report version changes).
   */
  invalidateCache(orderId: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.pdfCache.keys()) {
      if (key.startsWith(`${orderId}:`)) {
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      this.pdfCache.delete(key);
    }
    if (keysToDelete.length > 0) {
      this.logger.debug(`Invalidated ${keysToDelete.length} cached PDFs for order ${orderId}`);
    }
  }

  /**
   * Get the current cache size (for monitoring/debugging).
   */
  getCacheSize(): number {
    return this.pdfCache.size;
  }

  private setCacheEntry(key: string, value: string): void {
    // Evict oldest entries if cache is full
    if (this.pdfCache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.pdfCache.keys().next().value;
      if (firstKey) {
        this.pdfCache.delete(firstKey);
      }
    }
    this.pdfCache.set(key, value);
  }
}
