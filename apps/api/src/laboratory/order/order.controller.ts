import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';

@Controller('api/v1/orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KASIR, Role.ADMIN, Role.KLINIK_PARTNER)
  async create(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.orderService.create(dto, user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KASIR, Role.CS, Role.ADMIN, Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER, Role.SAMPLING, Role.ANALIS, Role.DOKTER, Role.KLINIK_PARTNER)
  async findAll(@Query() query: OrderQueryDto) {
    return this.orderService.findAll(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KASIR, Role.CS, Role.ADMIN, Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER, Role.SAMPLING, Role.ANALIS, Role.DOKTER, Role.KLINIK_PARTNER)
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.orderService.findById(id);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KASIR, Role.ADMIN, Role.SUPER_ADMIN)
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.orderService.cancel(id, dto, user.id);
  }
}
