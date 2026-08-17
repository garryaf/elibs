import {
  Controller,
  Patch,
  Post,
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
import { VerificationService } from './verification.service';
import { VerifyDetailDto } from './dto/verify-detail.dto';
import { RejectDetailDto } from './dto/reject-detail.dto';
import { RerunRequestDto } from './dto/rerun-request.dto';

/**
 * Per-parameter verification controller.
 *
 * Provides endpoints for verifying, rejecting, and requesting reruns
 * on individual OrderDetail records (test parameters).
 *
 * Requirements addressed: 4.1, 4.2, 4.6, 4.7, 10.3
 */
@ApiTags('Lab Workflow - Verification')
@ApiBearerAuth()
@Controller('api/v1/lab-workflow/order-details')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(DataScopeInterceptor)
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  /**
   * Verify a single OrderDetail (test parameter).
   * Uses the real userId from the JWT token for audit compliance (Requirement 4.7, 10.3).
   * Accepts optional verificationNotes (Requirement 4.8).
   */
  @Patch(':id/verify')
  @Roles(Role.ANALIS, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Verify a single test parameter (OrderDetail)',
    description:
      'Verifies an individual OrderDetail. When all OrderDetails in an Order are verified, the Order transitions to VERIFIED status automatically.',
  })
  async verifyDetail(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerifyDetailDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.verificationService.verifyDetail(
      id,
      user.id,
      dto.verificationNotes,
    );
  }

  /**
   * Reject a single OrderDetail (test parameter) with a reason.
   * Requires a rejection reason from the RerunReason enum (Requirement 4.2).
   * Uses the real userId for audit compliance (Requirement 4.7, 10.3).
   */
  @Patch(':id/reject')
  @Roles(Role.ANALIS, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Reject a single test parameter (OrderDetail)',
    description:
      'Rejects an individual OrderDetail with a reason enum (QC_FAILURE, SPECIMEN_ISSUE, EQUIPMENT_ERROR, OPERATOR_ERROR, OTHER).',
  })
  async rejectDetail(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectDetailDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.verificationService.rejectDetail(id, dto, user.id);
  }

  /**
   * Request a rerun for a single OrderDetail (test parameter).
   * Tracks rerunCount, rerunReason, and stores previousResults (Requirement 4.6).
   * Uses the real userId for audit compliance (Requirement 4.7, 10.3).
   */
  @Post(':id/rerun')
  @Roles(Role.ANALIS, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Request rerun for a single test parameter (OrderDetail)',
    description:
      'Requests a rerun for an individual OrderDetail. Previous results are stored in JSON for audit history. The rerunCount is incremented.',
  })
  async requestRerun(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RerunRequestDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.verificationService.requestRerun(id, dto, user.id);
  }
}
