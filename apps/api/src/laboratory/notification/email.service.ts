import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  /**
   * Stub for email delivery with PDF attachment.
   * In production, this would integrate with an SMTP service or email API (e.g., SendGrid).
   */
  async send(
    email: string,
    pdfBuffer: Buffer,
    orderNumber: string,
  ): Promise<void> {
    this.logger.log(
      `[Email] Sending report for order ${orderNumber} to ${email} (PDF size: ${pdfBuffer.length} bytes)`,
    );
    // Stub: resolve immediately
  }
}
