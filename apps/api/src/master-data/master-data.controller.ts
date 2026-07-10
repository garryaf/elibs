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
import { CreateTestCategoryDto } from './dto/create-test-category.dto';
import { UpdateTestCategoryDto } from './dto/update-test-category.dto';
import { CreateTestDto } from './dto/create-test.dto';
import { UpdateTestDto } from './dto/update-test.dto';
import { CreatePanelDto } from './dto/create-panel.dto';
import { UpdatePanelDto } from './dto/update-panel.dto';

@ApiTags('Master Data')
@ApiBearerAuth()
@Controller('api/v1/master')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MasterDataController {
  constructor(private readonly masterDataService: MasterDataService) {}

  // ─── Test Categories ─────────────────────────────────────────────────────────

  @Get('test-categories')
  @Roles(Role.KASIR, Role.CS, Role.ADMIN, Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER, Role.SAMPLING, Role.ANALIS, Role.DOKTER, Role.KLINIK_PARTNER)
  @ApiOperation({ summary: 'List all test categories' })
  async findAllCategories(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.masterDataService.findAllCategories(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Post('test-categories')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a test category' })
  async createCategory(@Body() dto: CreateTestCategoryDto) {
    return this.masterDataService.createCategory(dto);
  }

  @Put('test-categories/:id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a test category' })
  async updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTestCategoryDto,
  ) {
    return this.masterDataService.updateCategory(id, dto);
  }

  @Delete('test-categories/:id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Soft-delete a test category' })
  async deleteCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.masterDataService.softDeleteCategory(id);
  }

  // ─── Tests ────────────────────────────────────────────────────────────────────

  @Get('tests')
  @Roles(Role.KASIR, Role.CS, Role.ADMIN, Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER, Role.SAMPLING, Role.ANALIS, Role.DOKTER, Role.KLINIK_PARTNER)
  @ApiOperation({ summary: 'List all tests' })
  async findAllTests(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.masterDataService.findAllTests(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      categoryId,
    );
  }

  @Post('tests')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a test' })
  async createTest(@Body() dto: CreateTestDto) {
    return this.masterDataService.createTest(dto);
  }

  @Put('tests/:id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a test' })
  async updateTest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTestDto,
  ) {
    return this.masterDataService.updateTest(id, dto);
  }

  @Delete('tests/:id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Soft-delete a test' })
  async deleteTest(@Param('id', ParseUUIDPipe) id: string) {
    return this.masterDataService.softDeleteTest(id);
  }

  // ─── Panels ───────────────────────────────────────────────────────────────────

  @Get('panels')
  @Roles(Role.KASIR, Role.CS, Role.ADMIN, Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER, Role.SAMPLING, Role.ANALIS, Role.DOKTER, Role.KLINIK_PARTNER)
  @ApiOperation({ summary: 'List all test panels' })
  async findAllPanels(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.masterDataService.findAllPanels(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Post('panels')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a test panel' })
  async createPanel(@Body() dto: CreatePanelDto) {
    return this.masterDataService.createPanel(dto);
  }

  @Put('panels/:id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a test panel' })
  async updatePanel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePanelDto,
  ) {
    return this.masterDataService.updatePanel(id, dto);
  }

  @Delete('panels/:id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Soft-delete a test panel' })
  async deletePanel(@Param('id', ParseUUIDPipe) id: string) {
    return this.masterDataService.softDeletePanel(id);
  }
}
