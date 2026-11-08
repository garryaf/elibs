import {
  Controller,
  Get,
  Query,
  UseGuards,
  Post,
  Param,
  ParseUUIDPipe,
  NotFoundException,
  BadRequestException,
  Logger,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role, NotificationType, NotificationStatus } from '@prisma/client';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationService } from './notification.service';
import { WhatsAppService } from './whatsapp.service';
import { AuditService } from '../audit/audit.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('api/v1/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.OWNER, Role.ADMIN)
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly whatsAppService: WhatsAppService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List notification logs with pagination' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('orderId') orderId?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (
      status &&
      status !== 'undefined' &&
      Object.values(NotificationStatus).includes(status as NotificationStatus)
    ) {
      where.status = status;
    }
    if (
      type &&
      type !== 'undefined' &&
      Object.values(NotificationType).includes(type as NotificationType)
    ) {
      where.type = type;
    }
    if (orderId && orderId !== 'undefined') where.orderId = orderId;

    const [data, total] = await Promise.all([
      this.prisma.notificationLog.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: { order: { select: { orderNumber: true } } },
      }),
      this.prisma.notificationLog.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  @Post(':id/retry')
  @ApiOperation({ summary: 'Manually retry a failed notification delivery' })
  async retry(@Param('id', ParseUUIDPipe) id: string) {
    await this.notificationService.retryNotification(id);
    return { success: true, message: 'Notification delivery retried' };
  }
}

/**
 * Controller for triggering WhatsApp delivery for orders.
 * Separated from the admin-only NotificationController to allow
 * broader role access (lab staff triggering "Kirim via WA").
 *
 * Requirements: 11.5
 */
@ApiTags('WhatsApp Delivery')
@ApiBearerAuth()
@Controller('api/v1/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  Role.SUPER_ADMIN,
  Role.OWNER,
  Role.ADMIN,
  Role.MANAGER,
  Role.DOKTER,
  Role.ANALIS,
  Role.KASIR,
  Role.CS,
)
export class WhatsAppDeliveryController {
  private readonly logger = new Logger(WhatsAppDeliveryController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly whatsAppService: WhatsAppService,
    private readonly auditService: AuditService,
  ) {}

  @Post(':id/send-whatsapp')
  @ApiOperation({
    summary: 'Trigger WhatsApp delivery for an order report',
    description:
      'Triggers WhatsApp delivery via FONNTE notification service. ' +
      'If FONNTE_TOKEN is not configured, returns a wa.me fallback URL ' +
      'for manual sending via WhatsApp Web.',
  })
  async sendWhatsApp(
    @Param('id', ParseUUIDPipe) orderId: string,
    @CurrentUser() user: { id: string; sub?: string },
    @Req() req: Request,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        patient: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order tidak ditemukan');
    }

    // BE-1: Guard — only allow sending reports for APPROVED orders
    if (order.status !== 'APPROVED') {
      throw new BadRequestException(
        'Laporan belum bisa dikirim. Order harus sudah divalidasi (status APPROVED) oleh dokter terlebih dahulu.',
      );
    }

    const phone = order.patient.phone;
    const isValidPhone = this.whatsAppService.isValidPhone(phone);

    // Find or create a notification log to use as the portal token
    let portalToken: string;
    const existingLog = await this.prisma.notificationLog.findFirst({
      where: {
        orderId,
        type: NotificationType.WHATSAPP,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingLog) {
      portalToken = existingLog.id;
    } else {
      // Create a new notification log entry to serve as the portal token
      const newLog = await this.prisma.notificationLog.create({
        data: {
          orderId,
          type: NotificationType.WHATSAPP,
          recipient: phone || order.patient.name,
          status: NotificationStatus.PENDING,
        },
      });
      portalToken = newLog.id;
    }

    // Build the portal URL for the patient
    // BE-2: Prefer APP_BASE_URL for production. Log warning if falling back to localhost.
    const baseUrl =
      process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || '';
    if (!process.env.APP_BASE_URL && !process.env.NEXT_PUBLIC_BASE_URL) {
      this.logger.warn(
        'APP_BASE_URL is not configured. Portal URL will use relative path. ' +
          'Set APP_BASE_URL environment variable to the public domain (e.g., https://elis.example.com) for WhatsApp delivery.',
      );
    }
    const portalUrl = baseUrl
      ? `${baseUrl}/portal/${portalToken}`
      : `/portal/${portalToken}`;

    // Check if FONNTE is configured
    const fonnteConfigured = !!process.env.FONNTE_TOKEN;

    if (fonnteConfigured && isValidPhone) {
      // Trigger delivery via the notification service queue
      const message = `Hasil laboratorium Anda sudah tersedia. Silakan lihat di: ${portalUrl}`;
      await this.notificationService.queueNotification(
        orderId,
        NotificationType.WHATSAPP,
        phone!,
        { message },
      );

      this.logger.log(
        `WhatsApp delivery triggered for order ${order.orderNumber} to ${phone}`,
      );

      // BP-2: Audit log — track report shared via WhatsApp
      const userId = user?.sub || user?.id || 'unknown';
      const ipAddress =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.ip;
      await this.auditService
        .log(
          userId,
          'REPORT_SHARED_WHATSAPP',
          'Order',
          orderId,
          null,
          {
            method: 'fonnte',
            recipient: phone,
            orderNumber: order.orderNumber,
          },
          ipAddress,
        )
        .catch((err) => {
          this.logger.warn(
            `Failed to log WhatsApp share audit: ${err.message}`,
          );
        });

      return {
        success: true,
        message: 'Pengiriman via WhatsApp sedang diproses',
        data: {
          method: 'fonnte',
          portalUrl,
          phone,
        },
      };
    }

    // Fallback: return wa.me link for manual sending
    const waMessage = encodeURIComponent(
      `Hasil laboratorium order ${order.orderNumber} sudah tersedia. Silakan lihat di: ${portalUrl}`,
    );
    const waPhone = phone ? phone.replace(/^0/, '62') : '';
    const waLink = waPhone
      ? `https://wa.me/${waPhone}?text=${waMessage}`
      : `https://wa.me/?text=${waMessage}`;

    this.logger.log(
      `WhatsApp fallback (wa.me) generated for order ${order.orderNumber}`,
    );

    // BP-2: Audit log — track report shared via WhatsApp link
    const userId = user?.sub || user?.id || 'unknown';
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip;
    await this.auditService
      .log(
        userId,
        'REPORT_SHARED_WHATSAPP',
        'Order',
        orderId,
        null,
        {
          method: 'wa_link',
          recipient: waPhone || null,
          orderNumber: order.orderNumber,
        },
        ipAddress,
      )
      .catch((err) => {
        this.logger.warn(`Failed to log WhatsApp share audit: ${err.message}`);
      });

    return {
      success: true,
      message: fonnteConfigured
        ? 'Nomor telepon pasien tidak valid. Gunakan link WhatsApp Web untuk mengirim manual.'
        : 'FONNTE belum dikonfigurasi. Gunakan link WhatsApp Web untuk mengirim manual.',
      data: {
        method: 'wa_link',
        waLink,
        portalUrl,
        phone: waPhone || null,
      },
    };
  }
}
