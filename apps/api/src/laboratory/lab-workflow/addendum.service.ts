import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateAddendumDto } from './dto/create-addendum.dto';

@Injectable()
export class AddendumService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a post-approval addendum for an order.
   * Only allowed when order is in APPROVED or NOTIFIED status (post-approval).
   * Automatically increments version based on existing addendums.
   * Requirements: 12.2
   */
  async createAddendum(
    orderId: string,
    dto: CreateAddendumDto,
    userId: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    const postApprovalStatuses: OrderStatus[] = [
      OrderStatus.APPROVED,
      OrderStatus.NOTIFIED,
    ];

    if (!postApprovalStatuses.includes(order.status)) {
      throw new BadRequestException(
        `Addendum can only be created for orders in APPROVED or NOTIFIED status. Current status: ${order.status}`,
      );
    }

    // Determine the next version number
    const latestAddendum = await this.prisma.orderAddendum.findFirst({
      where: { orderId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    const nextVersion = latestAddendum ? latestAddendum.version + 1 : 1;

    // Increment report version on the order to signal report needs regeneration
    // Requirement 12.3: addendums included in subsequent report generations
    const addendum = await this.prisma.$transaction(async (tx) => {
      const created = await tx.orderAddendum.create({
        data: {
          orderId,
          authorId: userId,
          content: dto.content,
          version: nextVersion,
        },
      });

      await tx.order.update({
        where: { id: orderId },
        data: { reportVersion: { increment: 1 } },
      });

      return created;
    });

    return addendum;
  }

  /**
   * List all addendums for an order, ordered by version ascending.
   * Requirements: 12.2, 12.3
   */
  async getAddendums(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    return this.prisma.orderAddendum.findMany({
      where: { orderId },
      orderBy: { version: 'asc' },
    });
  }
}
