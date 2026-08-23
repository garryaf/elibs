import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import {
  Order,
  OrderDetail,
  Patient,
  TestMaster,
  ReferenceValue,
  Clinic,
  Doctor,
  OrderAddendum,
} from '@prisma/client';

export interface OrderWithDetails extends Order {
  patient: Patient;
  clinic?: Clinic | null;
  doctor?: Doctor | null;
  orderDetails: (OrderDetail & {
    test: TestMaster & { referenceValues: ReferenceValue[] };
  })[];
  addendums?: OrderAddendum[];
}

@Injectable()
export class PdfGeneratorService {
  private readonly logger = new Logger(PdfGeneratorService.name);

  /**
   * Generates a real PDF lab report using pdfkit.
   * Includes: clinic header, patient info, test results table with
   * reference ranges and flag indicators, addendums, and report version in footer.
   */
  async generateReport(order: OrderWithDetails, options?: { accreditationNumber?: string }): Promise<Buffer> {
    this.logger.log(`Generating PDF report for order ${order.orderNumber}`);

    return new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 60, left: 50, right: 50 },
          bufferPages: true,
          info: {
            Title: `Lab Report - ${order.orderNumber}`,
            Author: 'eLIS Laboratory Information System',
            Subject: `Laboratory Report for ${order.patient.name}`,
          },
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err: Error) => reject(err));

        this.renderHeader(doc, order);
        this.renderPatientInfo(doc, order);
        this.renderResultsTable(doc, order);
        this.renderInterpretation(doc, order);
        this.renderAddendums(doc, order);
        this.renderFooter(doc, order, options?.accreditationNumber);

        // BP-3: Conditional DRAFT watermark for non-approved orders
        if (order.status !== 'APPROVED' && order.status !== 'NOTIFIED') {
          this.renderDraftWatermark(doc);
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private renderHeader(doc: PDFKit.PDFDocument, order: OrderWithDetails): void {
    const clinicName = order.clinic?.name ?? 'eLIS Laboratory';
    const clinicAddress = order.clinic?.address ?? '';
    const clinicPhone = order.clinic?.phone ?? '';

    // Clinic header
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text(clinicName, { align: 'center' });

    if (clinicAddress) {
      doc.fontSize(9).font('Helvetica').text(clinicAddress, { align: 'center' });
    }
    if (clinicPhone) {
      doc.fontSize(9).font('Helvetica').text(`Tel: ${clinicPhone}`, { align: 'center' });
    }

    doc.moveDown(0.5);

    // Separator line
    const lineY = doc.y;
    doc
      .moveTo(50, lineY)
      .lineTo(545, lineY)
      .strokeColor('#333333')
      .lineWidth(1.5)
      .stroke();

    doc.moveDown(0.5);

    // Report title
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('HASIL PEMERIKSAAN LABORATORIUM', { align: 'center' });

    doc.moveDown(0.5);
  }

  private renderPatientInfo(doc: PDFKit.PDFDocument, order: OrderWithDetails): void {
    const patient = order.patient;
    const leftCol = 50;
    const rightCol = 300;
    const startY = doc.y;

    doc.fontSize(9).font('Helvetica');

    // Left column - Patient info
    doc.font('Helvetica-Bold').text('Informasi Pasien:', leftCol, startY);
    doc.font('Helvetica');
    doc.text(`Nama        : ${patient.name}`, leftCol, doc.y + 4);
    doc.text(`MRN         : ${patient.mrn}`);
    doc.text(`Tgl Lahir   : ${this.formatDate(patient.dateOfBirth)}`);
    doc.text(`Jenis Kelamin: ${patient.gender === 'MALE' ? 'Laki-laki' : 'Perempuan'}`);

    const leftEndY = doc.y;

    // Right column - Order info
    doc.font('Helvetica-Bold').text('Informasi Order:', rightCol, startY);
    doc.font('Helvetica');
    doc.text(`No. Order   : ${order.orderNumber}`, rightCol, doc.y + 4);
    doc.text(`Tgl Order   : ${this.formatDateTime(order.createdAt)}`, rightCol);
    doc.text(
      `Tgl Validasi: ${order.approvedAt ? this.formatDateTime(order.approvedAt) : '-'}`,
      rightCol,
    );
    if (order.doctor) {
      doc.text(`Dokter      : ${order.doctor.name}`, rightCol);
    }
    if (order.priority && order.priority !== 'ROUTINE') {
      doc.text(`Prioritas   : ${order.priority}`, rightCol);
    }

    const rightEndY = doc.y;
    doc.y = Math.max(leftEndY, rightEndY);
    doc.moveDown(1);

    // Separator line
    const lineY = doc.y;
    doc
      .moveTo(50, lineY)
      .lineTo(545, lineY)
      .strokeColor('#cccccc')
      .lineWidth(0.5)
      .stroke();

    doc.moveDown(0.5);
  }

  private renderResultsTable(doc: PDFKit.PDFDocument, order: OrderWithDetails): void {
    doc.fontSize(10).font('Helvetica-Bold').text('Hasil Pemeriksaan:', 50);
    doc.moveDown(0.5);

    // Table layout
    const colX = {
      test: 50,
      result: 200,
      flag: 280,
      unit: 320,
      refRange: 380,
    };
    const colWidths = {
      test: 145,
      result: 75,
      flag: 35,
      unit: 55,
      refRange: 130,
    };

    // Table header
    const headerY = doc.y;
    doc
      .rect(colX.test - 2, headerY - 2, 499, 16)
      .fillColor('#f0f0f0')
      .fill();

    doc.fillColor('#000000').fontSize(8).font('Helvetica-Bold');
    doc.text('Pemeriksaan', colX.test, headerY, { width: colWidths.test });
    doc.text('Hasil', colX.result, headerY, { width: colWidths.result });
    doc.text('Flag', colX.flag, headerY, { width: colWidths.flag });
    doc.text('Satuan', colX.unit, headerY, { width: colWidths.unit });
    doc.text('Nilai Rujukan', colX.refRange, headerY, { width: colWidths.refRange });

    doc.y = headerY + 18;

    // Table rows
    doc.font('Helvetica').fontSize(8);

    for (const detail of order.orderDetails) {
      // Check if we need a new page
      if (doc.y > 700) {
        doc.addPage();
        doc.y = 50;
      }

      const rowY = doc.y;
      const resultValue = detail.resultValue ?? '-';
      const flag = detail.flag ?? '';
      const unit = detail.test.unit ?? '';
      const refRange = this.formatReferenceRange(detail.test.referenceValues);

      // Flag indicator styling
      const flagColor = this.getFlagColor(flag);

      // Alternating row background
      const rowIndex = order.orderDetails.indexOf(detail);
      if (rowIndex % 2 === 1) {
        doc.rect(colX.test - 2, rowY - 1, 499, 14).fillColor('#fafafa').fill();
        doc.fillColor('#000000');
      }

      doc.text(detail.test.name, colX.test, rowY, { width: colWidths.test });

      // Result value — bold if flagged
      if (flag && flag !== 'NORMAL') {
        doc.font('Helvetica-Bold');
      }
      doc.text(resultValue, colX.result, rowY, { width: colWidths.result });
      doc.font('Helvetica');

      // Flag with color indicator
      if (flag && flag !== 'NORMAL') {
        doc.fillColor(flagColor);
        doc.text(this.formatFlag(flag), colX.flag, rowY, { width: colWidths.flag });
        doc.fillColor('#000000');
      } else {
        doc.text('', colX.flag, rowY, { width: colWidths.flag });
      }

      doc.text(unit, colX.unit, rowY, { width: colWidths.unit });
      doc.text(refRange, colX.refRange, rowY, { width: colWidths.refRange });

      doc.y = rowY + 14;
    }

    doc.moveDown(1);
  }

  private renderInterpretation(doc: PDFKit.PDFDocument, order: OrderWithDetails): void {
    if (!order.interpretation) return;

    doc.fontSize(9).font('Helvetica-Bold').text('Interpretasi:', 50);
    doc.font('Helvetica').text(order.interpretation, 50, doc.y + 2);
    doc.moveDown(1);
  }

  private renderAddendums(doc: PDFKit.PDFDocument, order: OrderWithDetails): void {
    const addendums = order.addendums;
    if (!addendums || addendums.length === 0) return;

    // Check if we need a new page
    if (doc.y > 680) {
      doc.addPage();
      doc.y = 50;
    }

    // Separator
    const lineY = doc.y;
    doc
      .moveTo(50, lineY)
      .lineTo(545, lineY)
      .strokeColor('#cccccc')
      .lineWidth(0.5)
      .stroke();

    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica-Bold').text('Addendum:', 50);
    doc.moveDown(0.3);

    for (const addendum of addendums) {
      if (doc.y > 700) {
        doc.addPage();
        doc.y = 50;
      }

      doc.fontSize(8).font('Helvetica-Bold');
      doc.text(
        `Addendum v${addendum.version} — ${this.formatDateTime(addendum.createdAt)}`,
        50,
      );
      doc.font('Helvetica').fontSize(8);
      doc.text(addendum.content, 60, doc.y + 2, { width: 480 });
      doc.moveDown(0.5);
    }
  }

  private renderFooter(doc: PDFKit.PDFDocument, order: OrderWithDetails, accreditationNumber?: string): void {
    const pages = doc.bufferedPageRange();
    const totalPages = pages.count;

    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);

      // Footer separator line
      doc
        .moveTo(50, 760)
        .lineTo(545, 760)
        .strokeColor('#cccccc')
        .lineWidth(0.5)
        .stroke();

      // Footer left: report version
      doc
        .fontSize(7)
        .font('Helvetica')
        .fillColor('#666666')
        .text(
          `Report Version: v${order.reportVersion ?? 1}`,
          50,
          765,
          { width: 200, align: 'left' },
        );

      // Footer center: page number
      doc.text(
        `Halaman ${i + 1} dari ${totalPages}`,
        200,
        765,
        { width: 150, align: 'center' },
      );

      // Footer right: generated timestamp
      doc.text(
        `Dicetak: ${this.formatDateTime(new Date())}`,
        350,
        765,
        { width: 195, align: 'right' },
      );

      // Disclaimer + Accreditation
      const disclaimer = accreditationNumber
        ? `Hasil pemeriksaan ini hanya berlaku untuk sampel yang diperiksa. No. Akreditasi: ${accreditationNumber}. Dokumen ini dicetak oleh eLIS.`
        : 'Hasil pemeriksaan ini hanya berlaku untuk sampel yang diperiksa. Dokumen ini dicetak oleh eLIS.';
      doc
        .fontSize(6)
        .fillColor('#999999')
        .text(
          disclaimer,
          50,
          778,
          { width: 495, align: 'center' },
        );
    }

    // Reset fill color
    doc.fillColor('#000000');
  }

  // === BP-3: Draft Watermark ===

  /**
   * Renders a diagonal "DRAFT" watermark across all pages.
   * Only called when the order has NOT been approved by a doctor.
   * Uses bufferPages (already enabled) to iterate over all pages.
   */
  private renderDraftWatermark(doc: PDFKit.PDFDocument): void {
    const pages = doc.bufferedPageRange();
    const totalPages = pages.count;

    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);

      // Save graphics state
      doc.save();

      // Position watermark in center of page, rotated diagonally
      // A4 page dimensions: 595.28 x 841.89 points
      const centerX = 297;
      const centerY = 421;

      doc
        .translate(centerX, centerY)
        .rotate(-45)
        .fontSize(72)
        .font('Helvetica-Bold')
        .fillColor('#cc0000')
        .opacity(0.12)
        .text('DRAFT', -150, -30, {
          width: 300,
          align: 'center',
        });

      // Restore graphics state
      doc.restore();
    }

    // Reset fill color and opacity
    doc.fillColor('#000000').opacity(1);
  }

  // === Helper Methods ===

  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  private formatDateTime(date: Date): string {
    return new Date(date).toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private formatReferenceRange(referenceValues: ReferenceValue[]): string {
    if (!referenceValues || referenceValues.length === 0) return '-';
    const ref = referenceValues[0];
    const min = Number(ref.minRef);
    const max = Number(ref.maxRef);
    return `${min} - ${max}`;
  }

  private formatFlag(flag: string): string {
    switch (flag) {
      case 'HIGH':
        return 'H';
      case 'LOW':
        return 'L';
      case 'CRITICAL':
        return 'C!';
      default:
        return flag;
    }
  }

  private getFlagColor(flag: string): string {
    switch (flag) {
      case 'HIGH':
        return '#cc6600';
      case 'LOW':
        return '#0066cc';
      case 'CRITICAL':
        return '#cc0000';
      default:
        return '#000000';
    }
  }
}
