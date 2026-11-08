import { Test, TestingModule } from '@nestjs/testing';
import {
  PdfReportProcessor,
  PdfGenerationJobData,
  PdfGenerationResult,
} from '../pdf-report.processor';
import { PdfGeneratorService } from '../pdf-generator.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { Job } from 'bullmq';

describe('PdfReportProcessor', () => {
  let processor: PdfReportProcessor;
  let prismaService: jest.Mocked<PrismaService>;
  let pdfGeneratorService: jest.Mocked<PdfGeneratorService>;

  const mockOrder = {
    id: 'order-uuid-1',
    orderNumber: 'LAB-202608-0001',
    reportVersion: 1,
    interpretation: null,
    patient: {
      name: 'John Doe',
      mrn: 'MRN001',
      dateOfBirth: new Date(),
      gender: 'MALE',
    },
    clinic: { name: 'Test Clinic', address: '123 Test St', phone: '021-555' },
    doctor: { name: 'Dr. Smith', email: 'dr@test.com' },
    orderDetails: [
      {
        resultValue: '5.5',
        flag: 'NORMAL',
        test: {
          name: 'Hemoglobin',
          unit: 'g/dL',
          referenceValues: [{ minRef: 12, maxRef: 16 }],
        },
      },
    ],
    addendums: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PdfReportProcessor,
        {
          provide: PrismaService,
          useValue: {
            order: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: PdfGeneratorService,
          useValue: {
            generateReport: jest.fn(),
          },
        },
      ],
    }).compile();

    processor = module.get<PdfReportProcessor>(PdfReportProcessor);
    prismaService = module.get(PrismaService);
    pdfGeneratorService = module.get(PdfGeneratorService);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('process', () => {
    it('should generate PDF and return result with correct fields', async () => {
      const pdfBuffer = Buffer.from('fake-pdf-content');
      (prismaService.order.findUnique as jest.Mock).mockResolvedValue(
        mockOrder,
      );
      pdfGeneratorService.generateReport.mockResolvedValue(pdfBuffer);

      const job = {
        data: { orderId: 'order-uuid-1', version: 1 },
      } as Job<PdfGenerationJobData>;

      const result: PdfGenerationResult = await processor.process(job);

      expect(result.orderId).toBe('order-uuid-1');
      expect(result.version).toBe(1);
      expect(result.pdfBase64).toBe(pdfBuffer.toString('base64'));
      expect(result.generatedAt).toBeDefined();
      expect(result.byteLength).toBe(pdfBuffer.length);
    });

    it('should throw error when order is not found', async () => {
      (prismaService.order.findUnique as jest.Mock).mockResolvedValue(null);

      const job = {
        data: { orderId: 'nonexistent-id', version: 1 },
      } as Job<PdfGenerationJobData>;

      await expect(processor.process(job)).rejects.toThrow(
        'Order nonexistent-id not found',
      );
    });

    it('should increment reportVersion when incrementVersion is true', async () => {
      const pdfBuffer = Buffer.from('fake-pdf-content');
      (prismaService.order.update as jest.Mock).mockResolvedValue({
        reportVersion: 2,
      });
      (prismaService.order.findUnique as jest.Mock).mockResolvedValue(
        mockOrder,
      );
      pdfGeneratorService.generateReport.mockResolvedValue(pdfBuffer);

      const job = {
        data: { orderId: 'order-uuid-1', version: 1, incrementVersion: true },
      } as Job<PdfGenerationJobData>;

      const result = await processor.process(job);

      expect(prismaService.order.update).toHaveBeenCalledWith({
        where: { id: 'order-uuid-1' },
        data: { reportVersion: { increment: 1 } },
        select: { reportVersion: true },
      });
      expect(result.version).toBe(2);
    });

    it('should NOT increment reportVersion when incrementVersion is false/undefined', async () => {
      const pdfBuffer = Buffer.from('fake-pdf-content');
      (prismaService.order.findUnique as jest.Mock).mockResolvedValue(
        mockOrder,
      );
      pdfGeneratorService.generateReport.mockResolvedValue(pdfBuffer);

      const job = {
        data: { orderId: 'order-uuid-1', version: 3 },
      } as Job<PdfGenerationJobData>;

      const result = await processor.process(job);

      expect(prismaService.order.update).not.toHaveBeenCalled();
      expect(result.version).toBe(3);
    });

    it('should include addendums ordered by version in PDF generation', async () => {
      const orderWithAddendums = {
        ...mockOrder,
        addendums: [
          {
            id: 'a1',
            version: 1,
            content: 'First addendum',
            createdAt: new Date(),
          },
          {
            id: 'a2',
            version: 2,
            content: 'Second addendum',
            createdAt: new Date(),
          },
        ],
      };

      const pdfBuffer = Buffer.from('pdf-with-addendums');
      (prismaService.order.findUnique as jest.Mock).mockResolvedValue(
        orderWithAddendums,
      );
      pdfGeneratorService.generateReport.mockResolvedValue(pdfBuffer);

      const job = {
        data: { orderId: 'order-uuid-1', version: 1 },
      } as Job<PdfGenerationJobData>;

      await processor.process(job);

      expect(pdfGeneratorService.generateReport).toHaveBeenCalledWith(
        expect.objectContaining({
          addendums: expect.arrayContaining([
            expect.objectContaining({ version: 1 }),
            expect.objectContaining({ version: 2 }),
          ]),
        }),
      );
    });
  });
});
