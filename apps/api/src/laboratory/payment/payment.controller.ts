import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaymentService } from './payment.service';
import { ReceiptService } from './receipt.service';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { SplitPaymentDto } from './dto/split-payment.dto';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('api/v1/orders/:id')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly receiptService: ReceiptService,
  ) {}

  @Post('pay')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('payments:process')
  @ApiOperation({ summary: 'Process payment for an order' })
  async processPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProcessPaymentDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.paymentService.processPayment(id, dto, user.id);
  }

  @Post('split-pay')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('payments:process')
  @ApiOperation({ summary: 'Process split payment for an order' })
  async processSplitPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SplitPaymentDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.paymentService.processSplitPayment(id, dto, user.id);
  }

  @Get('payments')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('payments:read')
  @ApiOperation({ summary: 'Get payment components for an order' })
  async getPaymentComponents(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentService.getPaymentComponents(id);
  }

  @Get('barcode')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('payments:barcode')
  @ApiOperation({ summary: 'Get barcode for an order' })
  async getBarcode(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentService.getBarcode(id);
  }

  @Get('invoice')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('payments:read')
  @ApiOperation({ summary: 'Get invoice for an order' })
  async getInvoice(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentService.getInvoice(id);
  }

  @Get('receipt')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('payments:read')
  @ApiOperation({ summary: 'Get receipt for an order' })
  async getReceipt(@Param('id', ParseUUIDPipe) id: string) {
    return this.receiptService.generateReceipt(id);
  }
}
