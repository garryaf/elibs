import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Body,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RefundStatus, Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RefundService } from './refund.service';
import { UpdateRefundStatusDto } from './dto/update-refund-status.dto';

@ApiTags('Refunds')
@ApiBearerAuth()
@Controller('api/v1/refunds')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class RefundController {
  constructor(private readonly refundService: RefundService) {}

  @Get()
  @RequirePermission('payments:read')
  @ApiOperation({ summary: 'List refunds with operational filters' })
  async listRefunds(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: RefundStatus,
    @Query('search') search?: string,
  ) {
    return this.refundService.listRefunds({
      page: page ? Number.parseInt(page, 10) : undefined,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
      status,
      search,
    });
  }

  @Patch(':id/status')
  @RequirePermission('payments:process')
  @ApiOperation({ summary: 'Approve, reject, or process a refund' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRefundStatusDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.refundService.updateStatus(id, dto, user.id);
  }
}
