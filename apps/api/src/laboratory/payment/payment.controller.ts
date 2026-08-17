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
import { InvoiceService } from './invoice.service';
import { RefundService } from './refund.service';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { SplitPaymentDto } from './dto/split-payment.dto';
import { DepositPaymentDto } from './dto/deposit-payment.dto';
import { CreateRefundDto } from './dto/create-refund.dto';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('api/v1/orders/:id')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly receiptService: ReceiptService,
    private readonly invoiceService: InvoiceService,
    private readonly refundService: RefundService,
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
  @ApiOperation({ summary: 'Get structured invoice for an order' })
  async getInvoice(@Param('id', ParseUUIDPipe) id: string) {
    return this.invoiceService.generateInvoice(id);
  }

  @Get('receipt')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('payments:read')
  @ApiOperation({ summary: 'Get receipt for an order' })
  async getReceipt(@Param('id', ParseUUIDPipe) id: string) {
    return this.receiptService.generateReceipt(id);
  }

  @Post('deposit')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('payments:process')
  @ApiOperation({ summary: 'Record deposit/advance payment for an order' })
  async processDeposit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DepositPaymentDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.paymentService.processDeposit(id, dto, user.id);
  }

  @Post('refund')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('payments:process')
  @ApiOperation({ summary: 'Process refund for an order' })
  async createRefund(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateRefundDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.refundService.createRefund(id, dto, user.id);
  }

  @Get('refunds')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('payments:read')
  @ApiOperation({ summary: 'Get refunds for an order' })
  async getRefunds(@Param('id', ParseUUIDPipe) id: string) {
    return this.refundService.getRefundsByOrder(id);
  }
}
