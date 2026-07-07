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
import { ProcessPaymentDto } from './dto/process-payment.dto';

@Controller('api/v1/orders/:id')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('pay')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KASIR, Role.ADMIN)
  async processPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProcessPaymentDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.paymentService.processPayment(id, dto, user.id);
  }

  @Get('barcode')
  @UseGuards(JwtAuthGuard)
  async getBarcode(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentService.getBarcode(id);
  }

  @Get('invoice')
  @UseGuards(JwtAuthGuard)
  async getInvoice(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentService.getInvoice(id);
  }
}
