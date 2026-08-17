import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PdfGeneratorService, OrderWithDetails } from '../notification/pdf-generator.service';

export interface PortalReportResult {
  orderNumber: string;
  patientName: string;
  clinicName: string | null;
  doctorName: string | null;
  orderDate: Date;
  approvedAt: Date | null;
  reportVersion: number;
  priority: string | null;
  results: {
    testName: string;
    resultValue: string | null;
    flag: string | null;
    unit: string | null;
    referenceRange: string | null;
  }[];
  addendums: {
    version: number;
    content: string;
    createdAt: Date;
  }[];
}

@Injectable()
export class PortalService {
  private readonly logger = new Logger(PortalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfGeneratorService: PdfGeneratorService,
  ) {}

  /**
   * Retrieve report data by portal token (notification log UUID).
   * The token IS the authentication — no JWT required.
   */
  async getReportByToken(token: string): Promise<PortalReportResult> {
    const order = await this.findOrderByToken(token);

    return {
      orderNumber: order.orderNumber,
      patientName: order.patient.name,
      clinicName: order.clinic?.name ?? null,
      doctorName: order.doctor?.name ?? null,
      orderDate: order.createdAt,
      approvedAt: order.approvedAt,
      reportVersion: order.reportVersion ?? 1,
      priority: order.priority ?? null,
      results: order.orderDetails.map((detail) => ({
        testName: detail.test.name,
        resultValue: detail.resultValue ?? null,
        flag: detail.flag ?? null,
        unit: detail.test.unit ?? null,
        referenceRange: this.formatReferenceRange(detail.test.referenceValues),
      })),
      addendums: (order.addendums ?? []).map((a) => ({
        version: a.version,
        content: a.content,
        createdAt: a.createdAt,
      })),
    };
  }

  /**
   * Generate or retrieve PDF report buffer by portal token.
   */
  async getReportPdfByToken(token: string): Promise<{ buffer: Buffer; orderNumber: string }> {
    const order = await this.findOrderByToken(token);
    const buffer = await this.pdfGeneratorService.generateReport(order as unknown as OrderWithDetails);
    return { buffer, orderNumber: order.orderNumber };
  }

  /**
   * Look up order by notification log token.
   * The notification log ID serves as the portal access token.
   */
  private async findOrderByToken(token: string) {
    // Look up the notification log by its UUID (the token)
    const notificationLog = await this.prisma.notificationLog.findUnique({
      where: { id: token },
      select: { orderId: true, status: true },
    });

    if (!notificationLog) {
      this.logger.warn(`Portal access attempted with invalid token: ${token}`);
      throw new NotFoundException('Laporan tidak ditemukan atau token tidak valid');
    }

    // Fetch the full order with all relations needed for report generation
    const order = await this.prisma.order.findUnique({
      where: { id: notificationLog.orderId },
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
      throw new NotFoundException('Order tidak ditemukan');
    }

    return order;
  }

  private formatReferenceRange(referenceValues: any[]): string | null {
    if (!referenceValues || referenceValues.length === 0) return null;
    const ref = referenceValues[0];
    const min = Number(ref.minRef);
    const max = Number(ref.maxRef);
    return `${min} - ${max}`;
  }
}
