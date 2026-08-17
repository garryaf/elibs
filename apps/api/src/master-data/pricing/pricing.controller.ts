import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PricingService } from './pricing.service';
import { CreatePriceListDto } from './dto/create-price-list.dto';
import { UpdatePriceListDto } from './dto/update-price-list.dto';
import { AddPriceListItemDto } from './dto/add-price-list-item.dto';

/**
 * PricingController exposes HTTP endpoints for managing price lists
 * and their items. Supports multi-tier pricing with temporal validity.
 *
 * Requirements: 7.1, 7.2, 7.3
 */
@ApiTags('Pricing')
@ApiBearerAuth()
@Controller('api/v1/master/price-lists')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  /**
   * GET /api/v1/master/price-lists
   * List all active price lists (within their effective date range).
   */
  @Get()
  @ApiOperation({ summary: 'List active price lists' })
  async getActivePriceLists() {
    return this.pricingService.getActivePriceLists();
  }

  /**
   * POST /api/v1/master/price-lists
   * Create a new price list with effectiveFrom/To validity period.
   */
  @Post()
  @ApiOperation({ summary: 'Create a new price list' })
  async createPriceList(@Body() dto: CreatePriceListDto) {
    return this.pricingService.createPriceList(dto);
  }

  /**
   * PATCH /api/v1/master/price-lists/:id
   * Update an existing price list.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a price list' })
  async updatePriceList(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePriceListDto,
  ) {
    return this.pricingService.updatePriceList(id, dto);
  }

  /**
   * POST /api/v1/master/price-lists/:id/items
   * Add an item (test with price) to an existing price list.
   */
  @Post(':id/items')
  @ApiOperation({ summary: 'Add an item to a price list' })
  async addPriceListItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddPriceListItemDto,
  ) {
    return this.pricingService.addPriceListItem({
      priceListId: id,
      testId: dto.testId,
      price: dto.price,
      discount: dto.discount,
    });
  }
}
