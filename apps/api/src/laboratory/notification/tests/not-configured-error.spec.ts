import { NotConfiguredError } from '../exceptions';
import { WhatsAppService } from '../whatsapp.service';
import { EmailService } from '../email.service';

describe('NotConfiguredError handling', () => {
  describe('NotConfiguredError class', () => {
    it('should contain channel and missingConfig fields', () => {
      const error = new NotConfiguredError('WhatsApp', 'FONNTE_TOKEN');
      expect(error.name).toBe('NotConfiguredError');
      expect(error.channel).toBe('WhatsApp');
      expect(error.missingConfig).toBe('FONNTE_TOKEN');
      expect(error.message).toContain('WhatsApp');
      expect(error.message).toContain('FONNTE_TOKEN');
      expect(error.message).toContain('not configured');
    });

    it('should be an instance of Error', () => {
      const error = new NotConfiguredError('Email', 'SMTP credentials');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('WhatsAppService.send()', () => {
    let service: WhatsAppService;
    const originalEnv = process.env.FONNTE_TOKEN;

    beforeEach(() => {
      service = new WhatsAppService();
      delete process.env.FONNTE_TOKEN;
    });

    afterEach(() => {
      if (originalEnv !== undefined) {
        process.env.FONNTE_TOKEN = originalEnv;
      } else {
        delete process.env.FONNTE_TOKEN;
      }
    });

    it('should throw NotConfiguredError when FONNTE_TOKEN is not set', async () => {
      const pdfBuffer = Buffer.from('test-pdf');

      await expect(
        service.send('6281234567890', pdfBuffer, 'ORD-001'),
      ).rejects.toThrow(NotConfiguredError);

      await expect(
        service.send('6281234567890', pdfBuffer, 'ORD-001'),
      ).rejects.toMatchObject({
        channel: 'WhatsApp',
        missingConfig: 'FONNTE_TOKEN',
      });
    });
  });

  describe('EmailService.send()', () => {
    let service: EmailService;
    const mockPrisma = {
      systemSetting: {
        findMany: jest.fn(),
      },
    } as any;

    beforeEach(() => {
      service = new EmailService(mockPrisma);
    });

    it('should throw NotConfiguredError when SMTP is not configured', async () => {
      mockPrisma.systemSetting.findMany.mockResolvedValue([]);

      const pdfBuffer = Buffer.from('test-pdf');

      await expect(
        service.send('test@example.com', pdfBuffer, 'ORD-001'),
      ).rejects.toThrow(NotConfiguredError);

      await expect(
        service.send('test@example.com', pdfBuffer, 'ORD-001'),
      ).rejects.toMatchObject({
        channel: 'Email',
        missingConfig: expect.stringContaining('SMTP'),
      });
    });
  });
});
