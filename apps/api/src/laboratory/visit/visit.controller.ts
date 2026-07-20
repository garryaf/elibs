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
  UseInterceptors,
  ParseUUIDPipe,
} from '@nestjs/common';
import * as express from 'express';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DataScopeInterceptor } from '../../common/interceptors/data-scope.interceptor';
import { VisitService } from './visit.service';
import { CreateVisitDto } from './dto/create-visit.dto';
import { UpdateVisitDto } from './dto/update-visit.dto';
import { CancelVisitDto } from './dto/cancel-visit.dto';
import { VisitQueryDto } from './dto/visit-query.dto';
import { OrderQueryDto } from '../order/dto/order-query.dto';

@Controller('api/v1/visits')
@UseInterceptors(DataScopeInterceptor)
export class VisitController {
  constructor(private readonly visitService: VisitService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KASIR, Role.CS, Role.ADMIN, Role.KLINIK_PARTNER, Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER, Role.ADMIN, Role.KASIR, Role.CS, Role.KLINIK_PARTNER)
  async findAll(@Query() query: VisitQueryDto, @Req() req: express.Request) {
    const clinicId = (req as any).dataScope?.clinicId;
    return this.visitService.findAll(query, clinicId);
  }

  @Get(':id/orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER, Role.ADMIN, Role.KASIR, Role.CS, Role.KLINIK_PARTNER)
  async findOrdersByVisit(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: OrderQueryDto,
  ) {
    return this.visitService.findOrdersByVisit(id, query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER, Role.ADMIN, Role.KASIR, Role.CS, Role.KLINIK_PARTNER)
  async findById(@Param('id', ParseUUIDPipe) id: string, @Req() req: express.Request) {
    const clinicId = (req as any).dataScope?.clinicId;
    return this.visitService.findById(id, clinicId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KASIR, Role.CS, Role.ADMIN, Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER)
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
