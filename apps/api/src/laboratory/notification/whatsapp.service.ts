import { Injectable, Logger } from '@nestjs/common';

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
   * Stub for WhatsApp message delivery with PDF attachment.
   * In production, this would integrate with WhatsApp Business API.
   */
  async send(
    phone: string,
    pdfBuffer: Buffer,
    orderNumber: string,
  ): Promise<void> {
    this.logger.log(
      `[WhatsApp] Sending report for order ${orderNumber} to ${phone} (PDF size: ${pdfBuffer.length} bytes)`,
    );
    // Stub: resolve immediately
  }
}
