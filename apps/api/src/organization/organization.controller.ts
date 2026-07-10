import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { OrganizationService } from './organization.service';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  CreatePositionDto,
  UpdatePositionDto,
} from './dto';

@ApiTags('Organization')
@ApiBearerAuth()
@Controller('api/v1')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  // === DEPARTMENTS ===

  @Get('departments')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'List all departments' })
  async findAllDepartments(@Query('includeInactive') includeInactive?: string) {
    const data = await this.organizationService.findAllDepartments(
      includeInactive === 'true',
    );
    return { data, total: data.length };
  }

  @Get('departments/:id')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Get department by ID' })
  async findDepartmentById(@Param('id', ParseUUIDPipe) id: string) {
    return this.organizationService.findDepartmentById(id);
  }

  @Post('departments')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Create a department' })
  async createDepartment(@Body() dto: CreateDepartmentDto) {
    return this.organizationService.createDepartment(dto);
  }

  @Put('departments/:id')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Update a department' })
  async updateDepartment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.organizationService.updateDepartment(id, dto);
  }

  @Delete('departments/:id')
  @Roles(Role.SUPER_ADMIN, Role.OWNER)
  @ApiOperation({ summary: 'Delete a department' })
  async deleteDepartment(@Param('id', ParseUUIDPipe) id: string) {
    return this.organizationService.deleteDepartment(id);
  }

  // === POSITIONS ===

  @Get('positions')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'List all positions' })
  async findAllPositions(
    @Query('departmentId') departmentId?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    const data = await this.organizationService.findAllPositions(
      departmentId,
      includeInactive === 'true',
    );
    return { data, total: data.length };
  }

  @Get('positions/:id')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Get position by ID' })
  async findPositionById(@Param('id', ParseUUIDPipe) id: string) {
    return this.organizationService.findPositionById(id);
  }

  @Post('positions')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Create a position' })
  async createPosition(@Body() dto: CreatePositionDto) {
    return this.organizationService.createPosition(dto);
  }

  @Put('positions/:id')
  @Roles(Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Update a position' })
  async updatePosition(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePositionDto,
  ) {
    return this.organizationService.updatePosition(id, dto);
  }

  @Delete('positions/:id')
  @Roles(Role.SUPER_ADMIN, Role.OWNER)
  @ApiOperation({ summary: 'Delete a position' })
  async deletePosition(@Param('id', ParseUUIDPipe) id: string) {
    return this.organizationService.deletePosition(id);
  }
}
