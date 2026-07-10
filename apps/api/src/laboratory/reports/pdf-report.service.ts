import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

@Injectable()
export class PdfReportService {
  /**
   * Generate a PDF report for revenue summary.
   * Returns a Buffer containing the PDF.
   */
  async generateRevenuePdf(data: any): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // Header
      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('eLIS - Revenue Report', { align: 'center' });
      doc.moveDown();
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`Period: ${data.startDate} to ${data.endDate}`);
      doc.text(`Generated: ${new Date().toLocaleString('id-ID')}`);
      doc.moveDown();

      // Summary
      doc.fontSize(12).font('Helvetica-Bold').text('Summary');
      doc.fontSize(10).font('Helvetica');
      doc.text(
        `Total Revenue: Rp ${Number(data.totalRevenue).toLocaleString('id-ID')}`,
      );
      doc.text(`Total Orders: ${data.totalOrders}`);
      doc.moveDown();

      // Daily breakdown table (simplified)
      if (data.daily && data.daily.length > 0) {
        doc.fontSize(12).font('Helvetica-Bold').text('Daily Breakdown');
        doc.moveDown(0.5);
        doc.fontSize(9).font('Helvetica');

        for (const day of data.daily.slice(0, 30)) {
          doc.text(
            `${day.date}  |  Orders: ${day.orderCount}  |  Revenue: Rp ${Number(day.revenue).toLocaleString('id-ID')}`,
          );
        }

        if (data.daily.length > 30) {
          doc.moveDown(0.5);
          doc.text(`... and ${data.daily.length - 30} more days`);
        }
      }

      doc.end();
    });
  }

  /**
   * Generate a PDF report for order status summary.
   * Returns a Buffer containing the PDF.
   */
  async generateOrderSummaryPdf(data: any): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('eLIS - Order Status Report', { align: 'center' });
      doc.moveDown();
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`Period: ${data.startDate} to ${data.endDate}`);
      doc.text(`Generated: ${new Date().toLocaleString('id-ID')}`);
      doc.moveDown();
      doc.text(`Total Orders: ${data.total}`);
      doc.moveDown();

      if (data.data && data.data.length > 0) {
        doc.fontSize(12).font('Helvetica-Bold').text('By Status');
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');
        for (const item of data.data) {
          doc.text(`${item.status}: ${item.count} orders`);
        }
      }

      doc.end();
    });
  }
}
