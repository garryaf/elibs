import {
  Controller,
  Post,
  Put,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LabWorkflowService } from './lab-workflow.service';
import { ConfirmSampleDto } from './dto/confirm-sample.dto';
import { EnterResultsDto } from './dto/enter-results.dto';
import { VerifyResultsDto } from './dto/verify-results.dto';
import { ApproveOrderDto } from './dto/approve-order.dto';

@Controller('api/v1/lab')
export class LabWorkflowController {
  constructor(private readonly labWorkflowService: LabWorkflowService) {}

  @Post(':orderId/sample')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SAMPLING, Role.ADMIN)
  async confirmSample(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: ConfirmSampleDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.labWorkflowService.confirmSample(orderId, dto, user.id);
  }

  @Get('queue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SAMPLING, Role.ANALIS, Role.DOKTER, Role.ADMIN, Role.SUPER_ADMIN)
  async getQueue(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.labWorkflowService.getQueue(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('approval-queue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DOKTER, Role.SUPER_ADMIN, Role.ADMIN)
  async getApprovalQueue(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.labWorkflowService.getApprovalQueue(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Put(':orderId/results')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ANALIS, Role.ADMIN)
  async enterResults(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: EnterResultsDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.labWorkflowService.enterResults(orderId, dto, user.id);
  }

  @Get(':orderId/delta-check')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ANALIS, Role.DOKTER, Role.ADMIN)
  async getDeltaCheck(
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.labWorkflowService.getDeltaCheck(orderId);
  }

  @Post(':orderId/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ANALIS, Role.ADMIN)
  async verifyResults(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: VerifyResultsDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.labWorkflowService.verifyResults(orderId, dto, user.id);
  }

  @Post(':orderId/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DOKTER, Role.SUPER_ADMIN)
  async approveOrder(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: ApproveOrderDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.labWorkflowService.approveOrder(orderId, dto, user.id);
  }
}
