import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import * as express from 'express';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { VisitService } from './visit.service';
import { CreateVisitDto } from './dto/create-visit.dto';
import { UpdateVisitDto } from './dto/update-visit.dto';
import { CancelVisitDto } from './dto/cancel-visit.dto';
import { VisitQueryDto } from './dto/visit-query.dto';
import { OrderQueryDto } from '../order/dto/order-query.dto';

@Controller('api/v1/visits')
export class VisitController {
  constructor(private readonly visitService: VisitService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KASIR, Role.CS, Role.ADMIN, Role.KLINIK_PARTNER, Role.SUPER_ADMIN)
  async create(
    @Body() dto: CreateVisitDto,
    @CurrentUser() user: any,
    @Req() req: express.Request,
  ) {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string) || req.ip;
    return this.visitService.create(dto, user.sub, ipAddress);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Query() query: VisitQueryDto) {
    return this.visitService.findAll(query);
  }

  @Get(':id/orders')
  @UseGuards(JwtAuthGuard)
  async findOrdersByVisit(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: OrderQueryDto,
  ) {
    return this.visitService.findOrdersByVisit(id, query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.visitService.findById(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KASIR, Role.CS, Role.ADMIN, Role.SUPER_ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVisitDto,
    @CurrentUser() user: any,
    @Req() req: express.Request,
  ) {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string) || req.ip;
    return this.visitService.update(id, dto, user.sub, ipAddress);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KASIR, Role.ADMIN, Role.SUPER_ADMIN)
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelVisitDto,
    @CurrentUser() user: any,
    @Req() req: express.Request,
  ) {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string) || req.ip;
    return this.visitService.cancel(id, dto, user.sub, ipAddress);
  }
}
