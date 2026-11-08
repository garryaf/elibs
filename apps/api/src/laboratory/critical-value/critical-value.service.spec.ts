import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException } from '@nestjs/common';
import { CriticalValueStatus, NotificationType } from '@prisma/client';
import { CriticalValueService } from './critical-value.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

describe('CriticalValueService', () => {
  let service: CriticalValueService;
  let prisma: any;
  let notificationService: any;
  let eventEmitter: any;
  let escalationQueue: any;

  beforeEach(async () => {
    prisma = {
      order: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      criticalValueLog: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      systemSetting: {
        findUnique: jest.fn(),
      },
    };

    notificationService = {
      queueNotification: jest.fn(),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    escalationQueue = {
      add: jest.fn(),
      getJob: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CriticalValueService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationService, useValue: notificationService },
        { provide: EventEmitter2, useValue: eventEmitter },
        {
          provide: getQueueToken('critical-value-escalation'),
          useValue: escalationQueue,
        },
      ],
    }).compile();

    service = module.get<CriticalValueService>(CriticalValueService);
  });

  describe('detectAndAlert', () => {
    it('should return null when order is not found', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      const result = await service.detectAndAlert(
        'order-1',
        'detail-1',
        '200',
        'test-1',
      );

      expect(result).toBeNull();
    });

    it('should create a CriticalValueLog, emit event, and schedule escalation', async () => {
      const mockOrder = {
        patientId: 'patient-1',
        clinicId: 'clinic-1',
        doctorId: 'doctor-1',
      };
      const mockLog = {
        id: 'log-1',
        orderId: 'order-1',
        orderDetailId: 'detail-1',
        testId: 'test-1',
        patientId: 'patient-1',
        resultValue: '200',
        notificationStatus: CriticalValueStatus.PENDING,
        flaggedAt: new Date('2026-01-01'),
      };
      const mockUpdatedLog = {
        ...mockLog,
        notificationStatus: CriticalValueStatus.NOTIFIED,
        notifiedAt: new Date(),
      };

      prisma.order.findUnique.mockResolvedValue(mockOrder);
      prisma.criticalValueLog.create.mockResolvedValue(mockLog);
      prisma.criticalValueLog.update.mockResolvedValue(mockUpdatedLog);
      prisma.systemSetting.findUnique.mockResolvedValue(null);

      const result = await service.detectAndAlert(
        'order-1',
        'detail-1',
        '200',
        'test-1',
      );

      expect(result).toEqual(mockUpdatedLog);
      expect(prisma.criticalValueLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: 'order-1',
          orderDetailId: 'detail-1',
          testId: 'test-1',
          patientId: 'patient-1',
          resultValue: '200',
          notificationStatus: CriticalValueStatus.PENDING,
          clinicianId: 'doctor-1',
        }),
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'critical-value.new',
        expect.objectContaining({
          id: 'log-1',
          orderId: 'order-1',
          testId: 'test-1',
        }),
      );
      expect(escalationQueue.add).toHaveBeenCalledWith(
        'escalate',
        { logId: 'log-1' },
        expect.objectContaining({
          delay: 15 * 60 * 1000,
          jobId: 'escalation-log-1',
        }),
      );
    });

    it('should use configurable escalation timeout from system settings', async () => {
      const customTimeout = 5 * 60 * 1000; // 5 minutes
      prisma.order.findUnique.mockResolvedValue({
        patientId: 'p1',
        clinicId: 'c1',
        doctorId: 'd1',
      });
      prisma.criticalValueLog.create.mockResolvedValue({
        id: 'log-2',
        flaggedAt: new Date(),
      });
      prisma.criticalValueLog.update.mockResolvedValue({ id: 'log-2' });
      prisma.systemSetting.findUnique.mockResolvedValue({
        value: String(customTimeout),
      });

      await service.detectAndAlert('order-2', 'detail-2', '300', 'test-2');

      expect(escalationQueue.add).toHaveBeenCalledWith(
        'escalate',
        { logId: 'log-2' },
        expect.objectContaining({ delay: customTimeout }),
      );
    });
  });

  describe('acknowledge', () => {
    it('should throw NotFoundException when log does not exist', async () => {
      prisma.criticalValueLog.findUnique.mockResolvedValue(null);

      await expect(
        service.acknowledge('non-existent', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update status to ACKNOWLEDGED and cancel escalation job', async () => {
      const mockLog = {
        id: 'log-1',
        notificationStatus: CriticalValueStatus.NOTIFIED,
      };
      const mockUpdated = {
        ...mockLog,
        notificationStatus: CriticalValueStatus.ACKNOWLEDGED,
        acknowledgedBy: 'user-1',
      };
      const mockJob = { remove: jest.fn() };

      prisma.criticalValueLog.findUnique.mockResolvedValue(mockLog);
      prisma.criticalValueLog.update.mockResolvedValue(mockUpdated);
      escalationQueue.getJob.mockResolvedValue(mockJob);

      const result = await service.acknowledge('log-1', 'user-1', 'Noted');

      expect(result).toEqual(mockUpdated);
      expect(prisma.criticalValueLog.update).toHaveBeenCalledWith({
        where: { id: 'log-1' },
        data: expect.objectContaining({
          notificationStatus: CriticalValueStatus.ACKNOWLEDGED,
          acknowledgedBy: 'user-1',
          acknowledgmentNotes: 'Noted',
        }),
      });
      expect(escalationQueue.getJob).toHaveBeenCalledWith('escalation-log-1');
      expect(mockJob.remove).toHaveBeenCalled();
    });

    it('should still succeed if escalation job not found', async () => {
      prisma.criticalValueLog.findUnique.mockResolvedValue({ id: 'log-1' });
      prisma.criticalValueLog.update.mockResolvedValue({
        id: 'log-1',
        notificationStatus: CriticalValueStatus.ACKNOWLEDGED,
      });
      escalationQueue.getJob.mockResolvedValue(null);

      const result = await service.acknowledge('log-1', 'user-1');
      expect(result.notificationStatus).toBe(CriticalValueStatus.ACKNOWLEDGED);
    });
  });

  describe('escalate', () => {
    it('should skip escalation when log is already acknowledged', async () => {
      prisma.criticalValueLog.findUnique.mockResolvedValue({
        id: 'log-1',
        notificationStatus: CriticalValueStatus.ACKNOWLEDGED,
      });

      await service.escalate('log-1');

      expect(prisma.criticalValueLog.update).not.toHaveBeenCalled();
      expect(notificationService.queueNotification).not.toHaveBeenCalled();
    });

    it('should update to ESCALATED and send notification when clinicianId is present', async () => {
      prisma.criticalValueLog.findUnique.mockResolvedValue({
        id: 'log-1',
        orderId: 'order-1',
        testId: 'test-1',
        patientId: 'patient-1',
        resultValue: '500',
        clinicianId: 'doctor-1',
        notificationStatus: CriticalValueStatus.NOTIFIED,
      });
      prisma.criticalValueLog.update.mockResolvedValue({});

      await service.escalate('log-1');

      expect(prisma.criticalValueLog.update).toHaveBeenCalledWith({
        where: { id: 'log-1' },
        data: expect.objectContaining({
          notificationStatus: CriticalValueStatus.ESCALATED,
          escalationMethod: 'SMS',
        }),
      });
      expect(notificationService.queueNotification).toHaveBeenCalledWith(
        'order-1',
        NotificationType.WHATSAPP,
        'doctor-1',
        expect.objectContaining({
          subject: 'Critical Value Alert - Escalation',
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'critical-value.escalated',
        expect.objectContaining({
          id: 'log-1',
        }),
      );
    });

    it('should not send notification when clinicianId is null', async () => {
      prisma.criticalValueLog.findUnique.mockResolvedValue({
        id: 'log-1',
        orderId: 'order-1',
        testId: 'test-1',
        patientId: 'patient-1',
        resultValue: '500',
        clinicianId: null,
        notificationStatus: CriticalValueStatus.NOTIFIED,
      });
      prisma.criticalValueLog.update.mockResolvedValue({});

      await service.escalate('log-1');

      expect(notificationService.queueNotification).not.toHaveBeenCalled();
    });

    it('should return early when log is not found', async () => {
      prisma.criticalValueLog.findUnique.mockResolvedValue(null);

      await service.escalate('non-existent');

      expect(prisma.criticalValueLog.update).not.toHaveBeenCalled();
    });
  });

  describe('getUnacknowledged', () => {
    it('should return all unacknowledged logs without clinicId filter', async () => {
      const mockLogs = [
        { id: 'log-1', notificationStatus: CriticalValueStatus.PENDING },
        { id: 'log-2', notificationStatus: CriticalValueStatus.NOTIFIED },
      ];
      prisma.criticalValueLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.getUnacknowledged();

      expect(result).toEqual(mockLogs);
      expect(prisma.criticalValueLog.findMany).toHaveBeenCalledWith({
        where: {
          notificationStatus: {
            in: [CriticalValueStatus.PENDING, CriticalValueStatus.NOTIFIED],
          },
        },
        orderBy: { flaggedAt: 'desc' },
      });
    });

    it('should filter by clinicId when provided', async () => {
      const mockOrders = [{ id: 'order-1' }, { id: 'order-2' }];
      const mockLogs = [{ id: 'log-1', orderId: 'order-1' }];

      prisma.order.findMany.mockResolvedValue(mockOrders);
      prisma.criticalValueLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.getUnacknowledged('clinic-1');

      expect(prisma.order.findMany).toHaveBeenCalledWith({
        where: { clinicId: 'clinic-1' },
        select: { id: true },
      });
      expect(prisma.criticalValueLog.findMany).toHaveBeenCalledWith({
        where: {
          notificationStatus: {
            in: [CriticalValueStatus.PENDING, CriticalValueStatus.NOTIFIED],
          },
          orderId: {
            in: ['order-1', 'order-2'],
          },
        },
        orderBy: { flaggedAt: 'desc' },
      });
      expect(result).toEqual(mockLogs);
    });
  });
});
