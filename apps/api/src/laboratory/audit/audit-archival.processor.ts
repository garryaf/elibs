import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AuditArchivalService } from './audit-archival.service';

/**
 * BullMQ processor for the `audit-archival` queue.
 * Runs as a scheduled repeatable job to clean up old audit log entries
 * based on the configured retention policy in system_settings.
 */
@Processor('audit-archival', { concurrency: 1 })
export class AuditArchivalProcessor extends WorkerHost {
  private readonly logger = new Logger(AuditArchivalProcessor.name);

  constructor(
    private readonly auditArchivalService: AuditArchivalService,
  ) {
    super();
  }

  async process(job: Job): Promise<{ archivedCount: number }> {
    this.logger.log(`Starting audit log archival job (id: ${job.id})`);

    try {
      const archivedCount = await this.auditArchivalService.archiveOldLogs();

      this.logger.log(
        `Audit archival job completed: ${archivedCount} entries archived`,
      );

      return { archivedCount };
    } catch (error) {
      this.logger.error(
        `Audit archival job failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}
