import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../common/prisma/prisma.service';

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  senderName: string;
  senderEmail: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves SMTP configuration from system_settings table.
   */
  async getSmtpConfig(): Promise<SmtpConfig | null> {
    const settings = await this.prisma.systemSetting.findMany({
      where: {
        key: {
          in: [
            'smtp_host',
            'smtp_port',
            'smtp_secure',
            'smtp_user',
            'smtp_pass',
            'smtp_sender_name',
            'smtp_sender_email',
          ],
        },
      },
    });

    const map = new Map(settings.map((s) => [s.key, s.value]));

    const host = map.get('smtp_host');
    if (!host) return null;

    return {
      host,
      port: parseInt(map.get('smtp_port') || '587', 10),
      secure: map.get('smtp_secure') === 'true',
      user: map.get('smtp_user') || '',
      pass: map.get('smtp_pass') || '',
      senderName: map.get('smtp_sender_name') || 'eLIS Laboratory',
      senderEmail: map.get('smtp_sender_email') || 'noreply@elis.local',
    };
  }

  /**
   * Sends an email with a PDF attachment via SMTP.
   * Configuration is read from the database (system_settings table).
   */
  async send(
    email: string,
    pdfBuffer: Buffer,
    orderNumber: string,
  ): Promise<void> {
    const config = await this.getSmtpConfig();

    if (!config) {
      this.logger.warn(
        `[Email] SMTP not configured. Skipping email to ${email} for order ${orderNumber}`,
      );
      return;
    }

    try {
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.user,
          pass: config.pass,
        },
      });

      await transporter.sendMail({
        from: `"${config.senderName}" <${config.senderEmail}>`,
        to: email,
        subject: `Hasil Pemeriksaan Laboratorium - ${orderNumber}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #6B8E6B;">eLIS Laboratory</h2>
            <p>Yth. Pasien,</p>
            <p>Terlampir hasil pemeriksaan laboratorium Anda dengan nomor order <strong>${orderNumber}</strong>.</p>
            <p>Silakan buka lampiran PDF untuk melihat detail hasil pemeriksaan.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="color: #6b7280; font-size: 12px;">
              Email ini dikirim secara otomatis oleh sistem eLIS.<br/>
              Jangan membalas email ini.
            </p>
          </div>
        `,
        attachments: [
          {
            filename: `hasil-lab-${orderNumber}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });

      this.logger.log(
        `[Email] ✅ Successfully sent report for order ${orderNumber} to ${email}`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `[Email] ❌ Failed to send email to ${email} for order ${orderNumber}: ${message}`,
      );
      throw error;
    }
  }

  /**
   * Sends a test email to verify SMTP configuration.
   */
  async sendTestEmail(recipientEmail: string): Promise<{ success: boolean; message: string }> {
    const config = await this.getSmtpConfig();

    if (!config) {
      return { success: false, message: 'SMTP belum dikonfigurasi. Silakan isi pengaturan SMTP terlebih dahulu.' };
    }

    try {
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.user,
          pass: config.pass,
        },
      });

      await transporter.sendMail({
        from: `"${config.senderName}" <${config.senderEmail}>`,
        to: recipientEmail,
        subject: '[eLIS] Test Email — Konfigurasi SMTP Berhasil',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #6B8E6B;">✅ SMTP Berhasil Dikonfigurasi</h2>
            <p>Email ini mengkonfirmasi bahwa konfigurasi SMTP eLIS sudah benar.</p>
            <p><strong>Server:</strong> ${config.host}:${config.port}</p>
            <p><strong>Waktu:</strong> ${new Date().toLocaleString('id-ID')}</p>
          </div>
        `,
      });

      return { success: true, message: `Email test berhasil dikirim ke ${recipientEmail}` };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message: `Gagal mengirim email: ${message}` };
    }
  }
}
