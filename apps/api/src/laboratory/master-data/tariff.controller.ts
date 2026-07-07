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
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { MasterDataService } from './master-data.service';
import { CreateTariffDto } from './dto/create-tariff.dto';
import { UpdateTariffDto } from './dto/update-tariff.dto';

@Controller('api/v1/master/tariffs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class TariffController {
  constructor(private readonly masterDataService: MasterDataService) {}

  @Get()
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
  async createTariff(@Body() dto: CreateTariffDto) {
    return this.masterDataService.createTariff(dto);
  }

  @Put(':id')
  async updateTariff(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTariffDto,
  ) {
    return this.masterDataService.updateTariff(id, dto);
  }

  @Delete(':id')
  async deleteTariff(@Param('id', ParseUUIDPipe) id: string) {
    return this.masterDataService.deleteTariff(id);
  }
}
