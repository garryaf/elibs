import { Controller, Get, Query, UseGuards, Post, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationService } from './notification.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('api/v1/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.OWNER, Role.ADMIN)
export class NotificationController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
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
    if (status) where.status = status;
    if (type) where.type = type;
    if (orderId) where.orderId = orderId;

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
