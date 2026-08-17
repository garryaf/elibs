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
  UseInterceptors,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { DataScopeInterceptor } from '../common/interceptors/data-scope.interceptor';
import { MasterDataService } from './master-data.service';
import { CreateReferenceValueDto } from './dto/create-reference-value.dto';
import { UpdateReferenceValueDto } from './dto/update-reference-value.dto';

@ApiTags('Master Data - Reference Values')
@ApiBearerAuth()
@Controller('api/v1/master/tests/:testId/reference-values')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(DataScopeInterceptor)
export class ReferenceValueController {
  constructor(private readonly masterDataService: MasterDataService) {}

  @Get()
  @Roles(
    Role.KASIR,
    Role.CS,
    Role.ADMIN,
    Role.SUPER_ADMIN,
    Role.OWNER,
    Role.MANAGER,
    Role.SAMPLING,
    Role.ANALIS,
    Role.DOKTER,
    Role.KLINIK_PARTNER,
  )
  @ApiOperation({ summary: 'List reference values for a test' })
  async findAll(
    @Param('testId', ParseUUIDPipe) testId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.masterDataService.findReferenceValuesByTest(
      testId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Post()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a reference value for a test' })
  async create(
    @Param('testId', ParseUUIDPipe) testId: string,
    @Body() dto: CreateReferenceValueDto,
  ) {
    return this.masterDataService.createReferenceValue(testId, dto);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a reference value' })
  async update(
    @Param('testId', ParseUUIDPipe) testId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReferenceValueDto,
  ) {
    return this.masterDataService.updateReferenceValue(id, testId, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete a reference value' })
  async delete(
    @Param('testId', ParseUUIDPipe) testId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.masterDataService.deleteReferenceValue(id, testId);
  }
}
