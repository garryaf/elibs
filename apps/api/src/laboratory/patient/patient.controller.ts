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
import { PatientService } from './patient.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { AddPatientInsuranceDto, UpdatePatientInsuranceDto } from './dto/manage-patient-insurance.dto';

@Controller('api/v1/patients')
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KASIR, Role.CS, Role.ADMIN, Role.SUPER_ADMIN, Role.KLINIK_PARTNER)
  async register(@Body() dto: CreatePatientDto) {
    return this.patientService.register(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KASIR, Role.CS, Role.ADMIN, Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER, Role.SAMPLING, Role.ANALIS, Role.DOKTER, Role.KLINIK_PARTNER)
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.patientService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
      sortBy,
      sortOrder,
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KASIR, Role.CS, Role.ADMIN, Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER, Role.SAMPLING, Role.ANALIS, Role.DOKTER, Role.KLINIK_PARTNER)
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.patientService.findById(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KASIR, Role.CS, Role.ADMIN, Role.SUPER_ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePatientDto,
  ) {
    return this.patientService.update(id, dto);
  }

  // ─── Patient Insurance Endpoints ───────────────────────────────────────────

  @Get(':id/insurances')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KASIR, Role.CS, Role.ADMIN, Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER)
  async getPatientInsurances(@Param('id', ParseUUIDPipe) id: string) {
    return this.patientService.getPatientInsurances(id);
  }

  @Post(':id/insurances')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KASIR, Role.CS, Role.ADMIN, Role.SUPER_ADMIN)
  async addPatientInsurance(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddPatientInsuranceDto,
  ) {
    return this.patientService.addPatientInsurance(id, dto);
  }

  @Put('insurances/:insuranceId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KASIR, Role.CS, Role.ADMIN, Role.SUPER_ADMIN)
  async updatePatientInsurance(
    @Param('insuranceId', ParseUUIDPipe) insuranceId: string,
    @Body() dto: UpdatePatientInsuranceDto,
  ) {
    return this.patientService.updatePatientInsurance(insuranceId, dto);
  }

  @Delete('insurances/:insuranceId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async removePatientInsurance(
    @Param('insuranceId', ParseUUIDPipe) insuranceId: string,
  ) {
    return this.patientService.removePatientInsurance(insuranceId);
  }
}
