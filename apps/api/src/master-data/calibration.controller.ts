import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsString, IsOptional, IsDateString } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';

export class CreateCalibrationDto {
  @IsDateString()
  calibratedAt: string;

  @IsString()
  calibratedBy: string;

  @IsString()
  result: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  nextDueDate?: string;

  @IsOptional()
  @IsString()
  certificateNo?: string;
}

@ApiTags('Equipment Calibration')
@ApiBearerAuth()
@Controller('api/v1/master/equipments/:equipmentId/calibrations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.ANALIS)
export class CalibrationController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Get calibration history for equipment' })
  async findAll(
    @Param('equipmentId', ParseUUIDPipe) equipmentId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const equipment = await this.prisma.equipment.findUnique({
      where: { id: equipmentId },
    });
    if (!equipment) {
      throw new NotFoundException('Equipment not found');
    }

    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await Promise.all([
      this.prisma.calibration.findMany({
        where: { equipmentId },
        skip,
        take: limitNum,
        orderBy: { calibratedAt: 'desc' },
      }),
      this.prisma.calibration.count({ where: { equipmentId } }),
    ]);

    return {
      data,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  @Post()
  @ApiOperation({ summary: 'Add calibration entry for equipment' })
  async create(
    @Param('equipmentId', ParseUUIDPipe) equipmentId: string,
    @Body() dto: CreateCalibrationDto,
    @CurrentUser() user: { id: string; name?: string },
  ) {
    const equipment = await this.prisma.equipment.findUnique({
      where: { id: equipmentId },
    });
    if (!equipment) {
      throw new NotFoundException('Equipment not found');
    }

    const calibration = await this.prisma.calibration.create({
      data: {
        equipmentId,
        calibratedAt: new Date(dto.calibratedAt),
        calibratedBy: dto.calibratedBy,
        result: dto.result,
        notes: dto.notes,
        nextDueDate: dto.nextDueDate ? new Date(dto.nextDueDate) : null,
        certificateNo: dto.certificateNo,
      },
    });

    // Update equipment's lastCalibration and nextCalibration fields
    await this.prisma.equipment.update({
      where: { id: equipmentId },
      data: {
        lastCalibration: new Date(dto.calibratedAt),
        nextCalibration: dto.nextDueDate ? new Date(dto.nextDueDate) : null,
      },
    });

    return calibration;
  }
}
