import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  ParseUUIDPipe,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { DataScopeInterceptor } from '../common/interceptors/data-scope.interceptor';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  CreateQualitativeRefDto,
  UpdateQualitativeRefDto,
} from './dto/create-qualitative-ref.dto';

@ApiTags('Master Data - Qualitative Reference Values')
@ApiBearerAuth()
@Controller('api/v1/master/tests/:testId/qualitative-references')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(DataScopeInterceptor)
export class QualitativeReferenceController {
  constructor(private readonly prisma: PrismaService) {}

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
  @ApiOperation({ summary: 'List qualitative reference values for a test' })
  async findAll(@Param('testId', ParseUUIDPipe) testId: string) {
    await this.validateTestExists(testId);

    const data = await this.prisma.qualitativeReferenceValue.findMany({
      where: { testId },
      orderBy: { optionValue: 'asc' },
    });

    return { data };
  }

  @Post()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a qualitative reference value mapping' })
  async create(
    @Param('testId', ParseUUIDPipe) testId: string,
    @Body() dto: CreateQualitativeRefDto,
  ) {
    await this.validateTestExists(testId);

    // Check for duplicate optionValue
    const existing = await this.prisma.qualitativeReferenceValue.findUnique({
      where: { testId_optionValue: { testId, optionValue: dto.optionValue } },
    });
    if (existing) {
      throw new BadRequestException({
        errorCode: 'ERR_DUPLICATE',
        message: `Opsi "${dto.optionValue}" sudah ada untuk tes ini`,
      });
    }

    return this.prisma.qualitativeReferenceValue.create({
      data: {
        testId,
        optionValue: dto.optionValue,
        flag: dto.flag,
        description: dto.description ?? null,
      },
    });
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a qualitative reference value' })
  async update(
    @Param('testId', ParseUUIDPipe) testId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQualitativeRefDto,
  ) {
    const record = await this.prisma.qualitativeReferenceValue.findFirst({
      where: { id, testId },
    });
    if (!record) {
      throw new NotFoundException('Qualitative reference value not found');
    }

    return this.prisma.qualitativeReferenceValue.update({
      where: { id },
      data: {
        ...(dto.optionValue !== undefined && { optionValue: dto.optionValue }),
        ...(dto.flag !== undefined && { flag: dto.flag }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete a qualitative reference value' })
  async remove(
    @Param('testId', ParseUUIDPipe) testId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const record = await this.prisma.qualitativeReferenceValue.findFirst({
      where: { id, testId },
    });
    if (!record) {
      throw new NotFoundException('Qualitative reference value not found');
    }

    await this.prisma.qualitativeReferenceValue.delete({ where: { id } });
    return { success: true, message: 'Deleted successfully' };
  }

  private async validateTestExists(testId: string) {
    const test = await this.prisma.testMaster.findFirst({
      where: { id: testId, deletedAt: null },
    });
    if (!test) {
      throw new NotFoundException(`Test with id '${testId}' not found`);
    }
  }
}
