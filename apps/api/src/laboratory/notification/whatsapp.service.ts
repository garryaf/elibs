import { Injectable, Logger } from '@nestjs/common';
import { NotConfiguredError } from './exceptions';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  /**
   * Validates if a phone number is valid for WhatsApp delivery.
   * Must start with "62" (Indonesian country code) or "08" (local format).
   */
  isValidPhone(phone: string | null | undefined): boolean {
    if (!phone) return false;
    return phone.startsWith('62') || phone.startsWith('08');
  }

  /**
   * WhatsApp message delivery with PDF attachment using Fonnte API.
   * @throws NotConfiguredError when FONNTE_TOKEN environment variable is not set
   */
  async send(
    phone: string,
    pdfBuffer: Buffer,
    orderNumber: string,
  ): Promise<void> {
    this.logger.log(
      `[WhatsApp] Sending report for order ${orderNumber} to ${phone} (PDF size: ${pdfBuffer.length} bytes)`,
    );

    const token = process.env.FONNTE_TOKEN;
    if (!token) {
      throw new NotConfiguredError('WhatsApp', 'FONNTE_TOKEN');
    }

    try {
      // Create a Blob from the Buffer for the FormData
      const blob = new Blob([new Uint8Array(pdfBuffer)], {
        type: 'application/pdf',
      });
      const formData = new FormData();
      formData.append('target', phone);
      formData.append(
        'message',
        `Berikut adalah hasil laboratorium untuk order ${orderNumber}.`,
      );
      formData.append('file', blob, `Hasil_Lab_${orderNumber}.pdf`);

      const response = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          Authorization: token,
        },
        body: formData,
      });

      const result = await response.json();

      if (!result.status) {
        throw new Error(result.reason || 'Failed to send WhatsApp message');
      }

      this.logger.log(`[WhatsApp] Successfully sent to ${phone}`);
    } catch (error: any) {
      this.logger.error(
        `[WhatsApp] Failed to send to ${phone}: ${error.message}`,
      );
      throw error;
    }
  }
}
