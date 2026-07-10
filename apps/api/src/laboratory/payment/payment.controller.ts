import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaymentService } from './payment.service';
import { ReceiptService } from './receipt.service';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { SplitPaymentDto } from './dto/split-payment.dto';

@Controller('api/v1/orders/:id')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly receiptService: ReceiptService,
  ) {}

  @Post('pay')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KASIR, Role.ADMIN, Role.SUPER_ADMIN)
  async processPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProcessPaymentDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.paymentService.processPayment(id, dto, user.id);
  }

  @Post('split-pay')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KASIR, Role.ADMIN, Role.SUPER_ADMIN)
  async processSplitPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SplitPaymentDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.paymentService.processSplitPayment(id, dto, user.id);
  }

  @Get('payments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KASIR, Role.CS, Role.ADMIN, Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER)
  async getPaymentComponents(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentService.getPaymentComponents(id);
  }

  @Get('barcode')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KASIR, Role.CS, Role.ADMIN, Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER, Role.SAMPLING, Role.ANALIS, Role.DOKTER)
  async getBarcode(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentService.getBarcode(id);
  }

  @Get('invoice')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KASIR, Role.CS, Role.ADMIN, Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER)
  async getInvoice(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentService.getInvoice(id);
  }

  @Get('receipt')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KASIR, Role.CS, Role.ADMIN, Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER)
  async getReceipt(@Param('id', ParseUUIDPipe) id: string) {
    return this.receiptService.generateReceipt(id);
  }
}
