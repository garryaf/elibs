import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { AuditArchivalService } from '../audit-archival.service';
import { AuditArchivalProcessor } from '../audit-archival.processor';
import { PrismaService } from '../../../common/prisma/prisma.service';

describe('AuditArchivalProcessor', () => {
  let processor: AuditArchivalProcessor;
  let service: AuditArchivalService;

  const mockArchivalService = {
    archiveOldLogs: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditArchivalProcessor,
        {
          provide: AuditArchivalService,
          useValue: mockArchivalService,
        },
      ],
    }).compile();

    processor = module.get<AuditArchivalProcessor>(AuditArchivalProcessor);
    service = module.get<AuditArchivalService>(AuditArchivalService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call archiveOldLogs and return the archived count', async () => {
    mockArchivalService.archiveOldLogs.mockResolvedValue(42);

    const job = { id: 'test-job-1' } as any;
    const result = await processor.process(job);

    expect(mockArchivalService.archiveOldLogs).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ archivedCount: 42 });
  });

  it('should propagate errors from the service', async () => {
    mockArchivalService.archiveOldLogs.mockRejectedValue(
      new Error('DB connection failed'),
    );

    const job = { id: 'test-job-2' } as any;
    await expect(processor.process(job)).rejects.toThrow('DB connection failed');
  });

  it('should return 0 when no logs are archived', async () => {
    mockArchivalService.archiveOldLogs.mockResolvedValue(0);

    const job = { id: 'test-job-3' } as any;
    const result = await processor.process(job);

    expect(result).toEqual({ archivedCount: 0 });
  });
});

describe('AuditArchivalService', () => {
  let service: AuditArchivalService;

  const mockPrisma = {
    systemSetting: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    $executeRaw: jest.fn(),
  };

  const mockQueue = {
    getRepeatableJobs: jest.fn().mockResolvedValue([]),
    removeRepeatableByKey: jest.fn(),
    add: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditArchivalService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: getQueueToken('audit-archival'), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<AuditArchivalService>(AuditArchivalService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getRetentionDays', () => {
    it('should return configured retention days from system_settings', async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue({
        key: 'audit_retention_days',
        value: '180',
      });

      const result = await service.getRetentionDays();
      expect(result).toBe(180);
    });

    it('should return default 365 when setting is not configured', async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue(null);

      const result = await service.getRetentionDays();
      expect(result).toBe(365);
    });

    it('should return default 365 when setting value is invalid', async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue({
        key: 'audit_retention_days',
        value: 'invalid',
      });

      const result = await service.getRetentionDays();
      expect(result).toBe(365);
    });

    it('should return default 365 when setting value is zero or negative', async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue({
        key: 'audit_retention_days',
        value: '0',
      });

      const result = await service.getRetentionDays();
      expect(result).toBe(365);
    });
  });

  describe('getArchivalCron', () => {
    it('should return configured cron from system_settings', async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue({
        key: 'audit_archival_cron',
        value: '0 3 * * *',
      });

      const result = await service.getArchivalCron();
      expect(result).toBe('0 3 * * *');
    });

    it('should return default cron when setting is not configured', async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue(null);

      const result = await service.getArchivalCron();
      expect(result).toBe('0 2 * * *');
    });

    it('should return default cron when setting value is empty', async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue({
        key: 'audit_archival_cron',
        value: '   ',
      });

      const result = await service.getArchivalCron();
      expect(result).toBe('0 2 * * *');
    });
  });

  describe('archiveOldLogs', () => {
    it('should delete logs older than retention period and update last run timestamp', async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue({
        key: 'audit_retention_days',
        value: '90',
      });
      mockPrisma.$executeRaw.mockResolvedValue(15);
      mockPrisma.systemSetting.upsert.mockResolvedValue({});

      const result = await service.archiveOldLogs();

      expect(result).toBe(15);
      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
      expect(mockPrisma.systemSetting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: 'audit_last_archival_run' },
          update: { value: expect.any(String) },
          create: { key: 'audit_last_archival_run', value: expect.any(String) },
        }),
      );
    });

    it('should use default retention when setting is not found', async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue(null);
      mockPrisma.$executeRaw.mockResolvedValue(0);
      mockPrisma.systemSetting.upsert.mockResolvedValue({});

      const result = await service.archiveOldLogs();

      expect(result).toBe(0);
      expect(mockPrisma.systemSetting.upsert).toHaveBeenCalled();
    });
  });

  describe('onModuleInit', () => {
    it('should register repeatable job with cron from system_settings', async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue({
        key: 'audit_archival_cron',
        value: '0 4 * * 0',
      });

      await service.onModuleInit();

      expect(mockQueue.getRepeatableJobs).toHaveBeenCalled();
      expect(mockQueue.add).toHaveBeenCalledWith(
        'archive-old-logs',
        {},
        expect.objectContaining({
          repeat: { pattern: '0 4 * * 0' },
          removeOnComplete: 10,
          removeOnFail: 5,
        }),
      );
    });

    it('should remove existing repeatable jobs before registering new one', async () => {
      mockQueue.getRepeatableJobs.mockResolvedValue([
        { key: 'old-job-key' },
      ]);
      mockPrisma.systemSetting.findUnique.mockResolvedValue(null);

      await service.onModuleInit();

      expect(mockQueue.removeRepeatableByKey).toHaveBeenCalledWith('old-job-key');
      expect(mockQueue.add).toHaveBeenCalled();
    });
  });
});
