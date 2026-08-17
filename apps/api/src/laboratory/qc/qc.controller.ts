import {
  Controller,
  Get,
  Post,
  Param,
  Body,
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
import { QCService } from './qc.service';
import { CreateQCSampleDto, RecordQCRunDto } from './dto';

@ApiTags('Quality Control')
@ApiBearerAuth()
@Controller('api/v1/qc')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QCController {
  constructor(private readonly qcService: QCService) {}

  @Post('samples')
  @Roles(Role.ANALIS, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Register a new QC sample' })
  async createQCSample(@Body() dto: CreateQCSampleDto) {
    return this.qcService.createQCSample(dto);
  }

  @Post('runs')
  @Roles(Role.ANALIS, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Record a QC run with results' })
  async recordQCRun(
    @Body() dto: RecordQCRunDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.qcService.recordQCRun(dto, user.id);
  }

  @Get('samples/:id/levey-jennings')
  @Roles(Role.ANALIS, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get Levey-Jennings chart data for a QC sample' })
  async getLeveyJennings(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('testId') testId?: string,
  ) {
    return this.qcService.getLeveyJenningsData(id, testId);
  }

  @Get('status/:testId')
  @Roles(Role.ANALIS, Role.DOKTER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get current QC status for a specific test' })
  async getQCStatus(@Param('testId', ParseUUIDPipe) testId: string) {
    return this.qcService.getQCStatus(testId);
  }

  @Get('dashboard')
  @Roles(Role.ANALIS, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get QC overview dashboard data' })
  async getDashboard() {
    return this.qcService.getDashboardData();
  }
}
