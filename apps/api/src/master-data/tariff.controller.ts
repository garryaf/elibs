import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { MasterDataService } from './master-data.service';
import { TariffResolverService } from './tariff-resolver.service';
import { CreateTariffDto } from './dto/create-tariff.dto';
import { UpdateTariffDto } from './dto/update-tariff.dto';

@ApiTags('Master Data')
@ApiBearerAuth()
@Controller('api/v1/master/tariffs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class TariffController {
  constructor(
    private readonly masterDataService: MasterDataService,
    private readonly tariffResolverService: TariffResolverService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all tariffs' })
  async findAllTariffs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.masterDataService.findAllTariffs(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create a tariff with automatic overlap closure' })
  async createTariff(@Body() dto: CreateTariffDto) {
    // Close any overlapping open-ended tariffs before creating the new one
    await this.tariffResolverService.closeOverlappingTariff(
      dto.testId,
      dto.clinicId ?? null,
      dto.insuranceId ?? null,
      new Date(dto.effectiveFrom),
    );

    return this.masterDataService.createTariff(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a tariff' })
  async updateTariff(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTariffDto,
  ) {
    return this.masterDataService.updateTariff(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a tariff' })
  async deleteTariff(@Param('id', ParseUUIDPipe) id: string) {
    return this.masterDataService.deleteTariff(id);
  }
}
