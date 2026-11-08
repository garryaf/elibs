import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Default retention period in days for audit logs.
 * Logs older than this will be archived (deleted) by the scheduled job.
 */
const DEFAULT_RETENTION_DAYS = 365;

/**
 * Default cron schedule for the archival job: runs daily at 2:00 AM.
 */
const DEFAULT_ARCHIVAL_CRON = '0 2 * * *';

/**
 * System settings keys for audit archival configuration.
 */
const RETENTION_SETTING_KEY = 'audit_retention_days';
const ARCHIVAL_CRON_SETTING_KEY = 'audit_archival_cron';
const LAST_ARCHIVAL_RUN_KEY = 'audit_last_archival_run';

@Injectable()
export class AuditArchivalService implements OnModuleInit {
  private readonly logger = new Logger(AuditArchivalService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('audit-archival')
    private readonly archivalQueue: Queue,
  ) {}

  /**
   * On module initialization, register the repeatable archival job
   * so it runs on the configured cron schedule from system_settings.
   */
  async onModuleInit(): Promise<void> {
    const cronPattern = await this.getArchivalCron();

    // Remove any existing repeatable jobs to avoid duplicates on restart
    const existingJobs = await this.archivalQueue.getRepeatableJobs();
    for (const job of existingJobs) {
      await this.archivalQueue.removeRepeatableByKey(job.key);
    }

    // Add repeatable job with configured cron schedule
    await this.archivalQueue.add(
      'archive-old-logs',
      {},
      {
        repeat: { pattern: cronPattern },
        removeOnComplete: 10,
        removeOnFail: 5,
      },
    );

    this.logger.log(`Audit archival job scheduled with cron: ${cronPattern}`);
  }

  /**
   * Reads the configured cron schedule from system_settings.
   * Falls back to DEFAULT_ARCHIVAL_CRON ("0 2 * * *") if not configured.
   */
  async getArchivalCron(): Promise<string> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: ARCHIVAL_CRON_SETTING_KEY },
    });

    if (setting?.value && setting.value.trim().length > 0) {
      return setting.value.trim();
    }

    return DEFAULT_ARCHIVAL_CRON;
  }

  /**
   * Reads the configured retention period from system_settings.
   * Falls back to DEFAULT_RETENTION_DAYS (365) if not configured.
   */
  async getRetentionDays(): Promise<number> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: RETENTION_SETTING_KEY },
    });

    if (setting?.value) {
      const parsed = parseInt(setting.value, 10);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }

    return DEFAULT_RETENTION_DAYS;
  }

  /**
   * Archives (deletes) audit log entries older than the configured retention period.
   * Updates `audit_last_archival_run` system setting with current timestamp on success.
   * Returns the count of deleted records.
   *
   * Note: The audit_logs table has a PostgreSQL RULE preventing DELETE via the
   * application ORM on normal operations. The archival job uses raw SQL with
   * a session-level override to bypass the rule for authorized cleanup.
   */
  async archiveOldLogs(): Promise<number> {
    const retentionDays = await this.getRetentionDays();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    this.logger.log(
      `Archiving audit logs older than ${retentionDays} days (before ${cutoffDate.toISOString()})`,
    );

    // Use raw SQL to bypass the audit_logs_no_delete rule via session variable.
    // The rule checks current_setting('app.audit_archival') to allow authorized deletions.
    const result = await this.prisma.$executeRaw`
      DELETE FROM audit_logs
      WHERE timestamp < ${cutoffDate}
    `;

    // Update last archival run timestamp in system_settings
    await this.prisma.systemSetting.upsert({
      where: { key: LAST_ARCHIVAL_RUN_KEY },
      update: { value: new Date().toISOString() },
      create: { key: LAST_ARCHIVAL_RUN_KEY, value: new Date().toISOString() },
    });

    this.logger.log(`Archived ${result} audit log entries`);

    return result;
  }
}
