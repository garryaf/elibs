import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DataScopeInterceptor } from '../../common/interceptors/data-scope.interceptor';
import { AddendumService } from './addendum.service';
import { CreateAddendumDto } from './dto/create-addendum.dto';

@ApiTags('Lab Workflow - Addendums')
@ApiBearerAuth()
@Controller('api/v1/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(DataScopeInterceptor)
export class AddendumController {
  constructor(private readonly addendumService: AddendumService) {}

  @Post(':id/addendum')
  @Roles(Role.DOKTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create post-approval addendum (DOKTER role)' })
  async createAddendum(
    @Param('id', ParseUUIDPipe) orderId: string,
    @Body() dto: CreateAddendumDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.addendumService.createAddendum(orderId, dto, user.id);
  }

  @Get(':id/addendums')
  @Roles(
    Role.DOKTER,
    Role.ANALIS,
    Role.ADMIN,
    Role.SUPER_ADMIN,
    Role.OWNER,
    Role.MANAGER,
  )
  @ApiOperation({ summary: 'List addendums for an order' })
  async getAddendums(@Param('id', ParseUUIDPipe) orderId: string) {
    return this.addendumService.getAddendums(orderId);
  }
}
