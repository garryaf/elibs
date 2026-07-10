import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Role, BatchInvoiceStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { BatchInvoiceService } from './batch-invoice.service';
import {
  CreateBatchInvoiceDto,
  UpdateBatchInvoiceStatusDto,
} from './dto/batch-invoice.dto';

@Controller('api/v1/batch-invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BatchInvoiceController {
  constructor(private readonly batchInvoiceService: BatchInvoiceService) {}

  @Post()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER, Role.KASIR)
  async createBatchInvoice(@Body() dto: CreateBatchInvoiceDto) {
    return this.batchInvoiceService.createBatchInvoice(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER, Role.KASIR)
  async getBatchInvoices(
    @Query('insuranceId') insuranceId?: string,
    @Query('status') status?: BatchInvoiceStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.batchInvoiceService.getBatchInvoices({
      insuranceId,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER, Role.KASIR)
  async getBatchInvoiceById(@Param('id', ParseUUIDPipe) id: string) {
    return this.batchInvoiceService.getBatchInvoiceById(id);
  }

  @Put(':id/status')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER, Role.KASIR)
  async updateBatchInvoiceStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBatchInvoiceStatusDto,
  ) {
    return this.batchInvoiceService.updateBatchInvoiceStatus(id, dto);
  }

  @Post(':id/cancel')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER, Role.KASIR)
  async cancelBatchInvoice(@Param('id', ParseUUIDPipe) id: string) {
    return this.batchInvoiceService.cancelBatchInvoice(id);
  }
}
