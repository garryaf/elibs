import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { CriticalValueService } from './critical-value.service';

export interface EscalationJobData {
  logId: string;
}

/**
 * BullMQ processor for the `critical-value-escalation` queue.
 *
 * This processor handles delayed escalation jobs. When a critical value is detected,
 * a delayed job is scheduled. If the clinician does not acknowledge the critical value
 * within the configured timeout, this processor fires and:
 * 1. Sends an SMS notification to the responsible clinician
 * 2. Updates the CriticalValueLog status to ESCALATED
 *
 * The delayed job is cancelled (removed) if the clinician acknowledges the alert
 * before the timeout expires.
 *
 * Requirements: 3.4
 */
@Processor('critical-value-escalation', { concurrency: 1 })
export class CriticalValueEscalationProcessor extends WorkerHost {
  private readonly logger = new Logger(CriticalValueEscalationProcessor.name);

  constructor(private readonly criticalValueService: CriticalValueService) {
    super();
  }

  async process(job: Job<EscalationJobData>): Promise<void> {
    const { logId } = job.data;

    this.logger.log(
      `Processing critical value escalation for log ${logId} (jobId: ${job.id})`,
    );

    try {
      await this.criticalValueService.escalate(logId);

      this.logger.log(`Critical value escalation completed for log ${logId}`);
    } catch (error) {
      this.logger.error(
        `Critical value escalation failed for log ${logId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}
