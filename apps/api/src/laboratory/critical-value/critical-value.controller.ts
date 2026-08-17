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
import { CriticalValueStatus, Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CriticalValueService } from './critical-value.service';
import { AcknowledgeCriticalValueDto } from './dto';

@ApiTags('Critical Values')
@ApiBearerAuth()
@Controller('api/v1/critical-values')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CriticalValueController {
  constructor(private readonly criticalValueService: CriticalValueService) {}

  @Get()
  @Roles(Role.DOKTER, Role.ANALIS, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'List critical value logs with optional filters' })
  async findAll(
    @Query('status') status?: CriticalValueStatus,
    @Query('patientId') patientId?: string,
    @Query('orderId') orderId?: string,
    @Query('testId') testId?: string,
  ) {
    return this.criticalValueService.findAll({
      status,
      patientId,
      orderId,
      testId,
    });
  }

  @Get('unacknowledged')
  @Roles(Role.DOKTER, Role.ANALIS, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get active (unacknowledged) critical value alerts for dashboard' })
  async getUnacknowledged(@Query('clinicId') clinicId?: string) {
    return this.criticalValueService.getUnacknowledged(clinicId);
  }

  @Post(':id/acknowledge')
  @Roles(Role.DOKTER, Role.ANALIS, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Acknowledge a critical value alert' })
  async acknowledge(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AcknowledgeCriticalValueDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.criticalValueService.acknowledge(id, user.id, dto.notes);
  }
}
