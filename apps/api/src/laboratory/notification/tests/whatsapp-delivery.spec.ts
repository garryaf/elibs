import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { WhatsAppDeliveryController } from '../notification.controller';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { NotificationService } from '../notification.service';
import { WhatsAppService } from '../whatsapp.service';

describe('WhatsAppDeliveryController', () => {
  let controller: WhatsAppDeliveryController;
  let prisma: any;
  let notificationService: any;
  let whatsAppService: any;

  beforeEach(async () => {
    prisma = {
      order: {
        findUnique: jest.fn(),
      },
      notificationLog: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };

    notificationService = {
      queueNotification: jest.fn(),
    };

    whatsAppService = {
      isValidPhone: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WhatsAppDeliveryController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationService, useValue: notificationService },
        { provide: WhatsAppService, useValue: whatsAppService },
      ],
    }).compile();

    controller = module.get<WhatsAppDeliveryController>(
      WhatsAppDeliveryController,
    );
  });

  it('should throw NotFoundException when order does not exist', async () => {
    prisma.order.findUnique.mockResolvedValue(null);

    await expect(controller.sendWhatsApp('non-existent-id')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should trigger FONNTE delivery when token configured and phone valid', async () => {
    const orderId = 'order-123';
    const mockOrder = {
      id: orderId,
      orderNumber: 'ORD-2026-001',
      patient: { name: 'John Doe', phone: '6281234567890' },
    };

    prisma.order.findUnique.mockResolvedValue(mockOrder);
    whatsAppService.isValidPhone.mockReturnValue(true);
    prisma.notificationLog.findFirst.mockResolvedValue({
      id: 'log-token-123',
    });
    notificationService.queueNotification.mockResolvedValue(undefined);

    // Mock FONNTE_TOKEN being configured
    const originalToken = process.env.FONNTE_TOKEN;
    process.env.FONNTE_TOKEN = 'test-token';

    try {
      const result = await controller.sendWhatsApp(orderId);

      expect(result.success).toBe(true);
      expect(result.data.method).toBe('fonnte');
      expect(result.data.phone).toBe('6281234567890');
      expect(result.data.portalUrl).toContain('/portal/log-token-123');
      expect(notificationService.queueNotification).toHaveBeenCalledWith(
        orderId,
        'WHATSAPP',
        '6281234567890',
        expect.objectContaining({
          message: expect.stringContaining('/portal/'),
        }),
      );
    } finally {
      if (originalToken !== undefined) {
        process.env.FONNTE_TOKEN = originalToken;
      } else {
        delete process.env.FONNTE_TOKEN;
      }
    }
  });

  it('should return wa.me fallback link when FONNTE not configured', async () => {
    const orderId = 'order-456';
    const mockOrder = {
      id: orderId,
      orderNumber: 'ORD-2026-002',
      patient: { name: 'Jane Doe', phone: '081234567890' },
    };

    prisma.order.findUnique.mockResolvedValue(mockOrder);
    whatsAppService.isValidPhone.mockReturnValue(true);
    prisma.notificationLog.findFirst.mockResolvedValue(null);
    prisma.notificationLog.create.mockResolvedValue({
      id: 'new-log-token',
    });

    // Ensure FONNTE_TOKEN is not set
    const originalToken = process.env.FONNTE_TOKEN;
    delete process.env.FONNTE_TOKEN;

    try {
      const result = await controller.sendWhatsApp(orderId);

      expect(result.success).toBe(true);
      expect(result.data.method).toBe('wa_link');
      expect(result.data.waLink).toContain('https://wa.me/6281234567890');
      expect(result.data.waLink).toContain('text=');
      expect(result.data.portalUrl).toContain('/portal/new-log-token');
      expect(notificationService.queueNotification).not.toHaveBeenCalled();
    } finally {
      if (originalToken !== undefined) {
        process.env.FONNTE_TOKEN = originalToken;
      } else {
        delete process.env.FONNTE_TOKEN;
      }
    }
  });

  it('should return wa.me fallback when phone is invalid even if FONNTE configured', async () => {
    const orderId = 'order-789';
    const mockOrder = {
      id: orderId,
      orderNumber: 'ORD-2026-003',
      patient: { name: 'No Phone', phone: null },
    };

    prisma.order.findUnique.mockResolvedValue(mockOrder);
    whatsAppService.isValidPhone.mockReturnValue(false);
    prisma.notificationLog.findFirst.mockResolvedValue({
      id: 'log-existing',
    });

    const originalToken = process.env.FONNTE_TOKEN;
    process.env.FONNTE_TOKEN = 'test-token';

    try {
      const result = await controller.sendWhatsApp(orderId);

      expect(result.success).toBe(true);
      expect(result.data.method).toBe('wa_link');
      expect(result.data.waLink).toContain('https://wa.me/?text=');
      expect(notificationService.queueNotification).not.toHaveBeenCalled();
    } finally {
      if (originalToken !== undefined) {
        process.env.FONNTE_TOKEN = originalToken;
      } else {
        delete process.env.FONNTE_TOKEN;
      }
    }
  });

  it('should create new notification log as portal token when none exists', async () => {
    const orderId = 'order-new';
    const mockOrder = {
      id: orderId,
      orderNumber: 'ORD-2026-004',
      patient: { name: 'New Patient', phone: '6289876543210' },
    };

    prisma.order.findUnique.mockResolvedValue(mockOrder);
    whatsAppService.isValidPhone.mockReturnValue(true);
    prisma.notificationLog.findFirst.mockResolvedValue(null);
    prisma.notificationLog.create.mockResolvedValue({
      id: 'newly-created-token',
    });

    const originalToken = process.env.FONNTE_TOKEN;
    delete process.env.FONNTE_TOKEN;

    try {
      const result = await controller.sendWhatsApp(orderId);

      expect(prisma.notificationLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId,
          type: 'WHATSAPP',
          recipient: '6289876543210',
          status: 'PENDING',
        }),
      });
      expect(result.data.portalUrl).toContain('/portal/newly-created-token');
    } finally {
      if (originalToken !== undefined) {
        process.env.FONNTE_TOKEN = originalToken;
      } else {
        delete process.env.FONNTE_TOKEN;
      }
    }
  });

  it('should convert local phone format (08x) to international (62x) in wa.me link', async () => {
    const orderId = 'order-local-phone';
    const mockOrder = {
      id: orderId,
      orderNumber: 'ORD-2026-005',
      patient: { name: 'Local Phone', phone: '081234567890' },
    };

    prisma.order.findUnique.mockResolvedValue(mockOrder);
    whatsAppService.isValidPhone.mockReturnValue(true);
    prisma.notificationLog.findFirst.mockResolvedValue({ id: 'token-local' });

    const originalToken = process.env.FONNTE_TOKEN;
    delete process.env.FONNTE_TOKEN;

    try {
      const result = await controller.sendWhatsApp(orderId);

      expect(result.data.method).toBe('wa_link');
      // Phone should be converted: 081234567890 -> 6281234567890
      expect(result.data.waLink).toContain('https://wa.me/6281234567890');
    } finally {
      if (originalToken !== undefined) {
        process.env.FONNTE_TOKEN = originalToken;
      } else {
        delete process.env.FONNTE_TOKEN;
      }
    }
  });
});
