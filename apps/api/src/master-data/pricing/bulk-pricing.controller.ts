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
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BulkPricingService } from './bulk-pricing.service';
import { BulkAdjustRequestDto } from './dto/bulk-adjust.dto';

/**
 * BulkPricingController exposes endpoints for:
 * 1. Bulk price adjustment (preview + execute)
 * 2. Price change history (audit trail)
 * 3. Apply approved price changes
 */
@ApiTags('Pricing - Bulk')
@ApiBearerAuth()
@Controller('api/v1/master/pricing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BulkPricingController {
  constructor(private readonly bulkPricingService: BulkPricingService) {}

  /**
   * POST /api/v1/master/pricing/bulk-adjust/preview
   * Preview bulk price adjustment without applying.
   */
  @Post('bulk-adjust/preview')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Preview bulk price adjustment' })
  async previewBulkAdjust(@Body() dto: BulkAdjustRequestDto) {
    return this.bulkPricingService.previewBulkAdjust(dto);
  }

  /**
   * POST /api/v1/master/pricing/bulk-adjust
   * Execute bulk price adjustment. If requiresApproval=true, creates an approval request.
   */
  @Post('bulk-adjust')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Execute bulk price adjustment (or create approval request)' })
  async executeBulkAdjust(
    @Body() dto: BulkAdjustRequestDto,
    @CurrentUser() user: { id: string; name?: string },
  ) {
    return this.bulkPricingService.executeBulkAdjust(dto, user.id, user.name);
  }

  /**
   * POST /api/v1/master/pricing/apply-approved/:approvalId
   * Apply a previously approved bulk price adjustment.
   */
  @Post('apply-approved/:approvalId')
  @Roles(Role.MANAGER, Role.OWNER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Apply an approved bulk price adjustment' })
  async applyApproved(
    @Param('approvalId', ParseUUIDPipe) approvalId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.bulkPricingService.applyApprovedBulkAdjust(approvalId, user.id);
  }

  /**
   * GET /api/v1/master/pricing/history
   * Get all price change history (paginated).
   */
  @Get('history')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OWNER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all price change history' })
  async getAllHistory(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.bulkPricingService.getAllPriceHistory(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  /**
   * GET /api/v1/master/pricing/history/:testId
   * Get price change history for a specific test.
   */
  @Get('history/:testId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OWNER, Role.SUPER_ADMIN, Role.ANALIS)
  @ApiOperation({ summary: 'Get price history for a specific test' })
  async getTestHistory(
    @Param('testId', ParseUUIDPipe) testId: string,
    @Query('limit') limit?: string,
  ) {
    return this.bulkPricingService.getPriceHistory(testId, limit ? parseInt(limit, 10) : 20);
  }
}
