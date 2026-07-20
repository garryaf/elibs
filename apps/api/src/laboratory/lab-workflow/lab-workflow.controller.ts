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
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
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

@ApiTags('Lab Workflow')
@ApiBearerAuth()
@Controller('api/v1/lab')
export class LabWorkflowController {
  constructor(private readonly labWorkflowService: LabWorkflowService) {}

  @Post(':orderId/sample')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SAMPLING, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Confirm sample collection for an order' })
  async confirmSample(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: ConfirmSampleDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.labWorkflowService.confirmSample(orderId, dto, user.id);
  }

  @Get('queue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SAMPLING, Role.ANALIS, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get lab processing queue' })
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
  @Roles(Role.DOKTER, Role.SUPER_ADMIN, Role.ADMIN, Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Get doctor approval queue' })
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
  @Roles(Role.ANALIS, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Enter test results for an order' })
  async enterResults(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: EnterResultsDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.labWorkflowService.enterResults(orderId, dto, user.id);
  }

  @Get(':orderId/delta-check')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ANALIS, Role.DOKTER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get delta check comparison with previous results' })
  async getDeltaCheck(
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.labWorkflowService.getDeltaCheck(orderId);
  }

  @Post(':orderId/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ANALIS, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Verify test results (analyst verification)' })
  async verifyResults(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: VerifyResultsDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.labWorkflowService.verifyResults(orderId, dto, user.id);
  }

  @Post(':orderId/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  // Clinical safety decision: ADMIN can VIEW approval queue (see getApprovalQueue)
  // but CANNOT approve results. Only licensed doctors (DOKTER) may approve.
  // See: USER-MANUAL Section 8 — ADMIN role limited to queue visibility only.
  @Roles(Role.DOKTER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Approve test results (doctor approval)' })
  async approveOrder(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: ApproveOrderDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.labWorkflowService.approveOrder(orderId, dto, user.id);
  }
}
