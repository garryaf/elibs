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
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ReferenceMasterService } from './reference-master.service';
import {
  CreateDoctorDto,
  CreateClinicDto,
  CreateInsuranceDto,
  CreateEquipmentDto,
  CreateReagentDto,
  CreateSampleTypeDto,
  CreateMeasurementUnitDto,
} from './dto/create-reference-master.dto';

/**
 * Generic CRUD controller for reference/master data entities:
 * - Doctors
 * - Clinics
 * - Insurances
 * - Equipment
 * - Reagents
 * - Sample Types
 * - Measurement Units
 */

// ─── Doctors ────────────────────────────────────────────────────────────────

@Controller('api/v1/master/doctors')
export class DoctorController {
  constructor(private readonly service: ReferenceMasterService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll('doctor', { page, limit, search });
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  create(@Body() dto: CreateDoctorDto) {
    return this.service.create('doctor', dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<CreateDoctorDto>) {
    return this.service.update('doctor', id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.softDelete('doctor', id);
  }
}

// ─── Clinics ────────────────────────────────────────────────────────────────

@Controller('api/v1/master/clinics')
export class ClinicController {
  constructor(private readonly service: ReferenceMasterService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll('clinic', { page, limit, search });
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  create(@Body() dto: CreateDoctorDto) {
    return this.service.create('clinic', dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<CreateDoctorDto>) {
    return this.service.update('clinic', id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.softDelete('clinic', id);
  }
}

// ─── Insurances ─────────────────────────────────────────────────────────────

@Controller('api/v1/master/insurances')
export class InsuranceController {
  constructor(private readonly service: ReferenceMasterService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll('insurance', { page, limit, search });
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  create(@Body() dto: CreateDoctorDto) {
    return this.service.create('insurance', dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<CreateDoctorDto>) {
    return this.service.update('insurance', id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.softDelete('insurance', id);
  }
}

// ─── Equipment ──────────────────────────────────────────────────────────────

@Controller('api/v1/master/equipments')
export class EquipmentController {
  constructor(private readonly service: ReferenceMasterService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll('equipment', { page, limit, search });
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  create(@Body() dto: CreateEquipmentDto) {
    return this.service.create('equipment', dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<CreateEquipmentDto>) {
    return this.service.update('equipment', id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.softDelete('equipment', id);
  }
}

// ─── Reagents ───────────────────────────────────────────────────────────────

@Controller('api/v1/master/reagents')
export class ReagentController {
  constructor(private readonly service: ReferenceMasterService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll('reagent', { page, limit, search });
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  create(@Body() dto: CreateReagentDto) {
    return this.service.create('reagent', dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<CreateReagentDto>) {
    return this.service.update('reagent', id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.softDelete('reagent', id);
  }
}

// ─── Sample Types ───────────────────────────────────────────────────────────

@Controller('api/v1/master/sample-types')
export class SampleTypeController {
  constructor(private readonly service: ReferenceMasterService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll('sampleTypeMaster', { page, limit });
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  create(@Body() dto: CreateDoctorDto) {
    return this.service.create('sampleTypeMaster', dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<CreateDoctorDto>) {
    return this.service.update('sampleTypeMaster', id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.softDelete('sampleTypeMaster', id);
  }
}

// ─── Measurement Units ──────────────────────────────────────────────────────

@Controller('api/v1/master/units')
export class MeasurementUnitController {
  constructor(private readonly service: ReferenceMasterService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll('measurementUnit', { page, limit });
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  create(@Body() dto: CreateDoctorDto) {
    return this.service.create('measurementUnit', dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<CreateDoctorDto>) {
    return this.service.update('measurementUnit', id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.softDelete('measurementUnit', id);
  }
}
