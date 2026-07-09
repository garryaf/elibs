import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { RegionService } from './region.service';
import { RegionSyncService } from './region-sync.service';
import {
  RegionQueryDto,
  KabupatenKotaQueryDto,
  KecamatanQueryDto,
  KelurahanDesaQueryDto,
} from './dto/region-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('api/v1/regions')
@UseGuards(JwtAuthGuard)
export class RegionController {
  constructor(
    private readonly regionService: RegionService,
    private readonly regionSyncService: RegionSyncService,
  ) {}

  @Get('provinsi')
  async findAllProvinsi(@Query() query: RegionQueryDto) {
    const result = await this.regionService.findAllProvinsi(
      query.page,
      query.limit,
      query.search,
    );
    return {
      success: true,
      message: 'Provinsi list retrieved successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  @Get('kabupaten-kota')
  async findKabupatenKota(@Query() query: KabupatenKotaQueryDto) {
    const result = await this.regionService.findKabupatenKotaByProvinsi(
      query.provinsiId,
      query.page,
      query.limit,
      query.search,
    );
    return {
      success: true,
      message: 'Kabupaten/Kota list retrieved successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  @Get('kecamatan')
  async findKecamatan(@Query() query: KecamatanQueryDto) {
    const result = await this.regionService.findKecamatanByKabupatenKota(
      query.kabupatenKotaId,
      query.page,
      query.limit,
      query.search,
    );
    return {
      success: true,
      message: 'Kecamatan list retrieved successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  @Get('kelurahan-desa')
  async findKelurahanDesa(@Query() query: KelurahanDesaQueryDto) {
    const result = await this.regionService.findKelurahanDesaByKecamatan(
      query.kecamatanId,
      query.page,
      query.limit,
      query.search,
    );
    return {
      success: true,
      message: 'Kelurahan/Desa list retrieved successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  @Post('sync')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async syncRegions() {
    const result = await this.regionSyncService.syncAll();
    return {
      success: true,
      message: 'Region sync completed',
      data: result,
    };
  }
}
