import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateDepartmentDto, UpdateDepartmentDto, CreatePositionDto, UpdatePositionDto } from './dto';

@Injectable()
export class OrganizationService {
  constructor(private prisma: PrismaService) {}

  // === DEPARTMENTS ===

  async createDepartment(dto: CreateDepartmentDto) {
    const existing = await this.prisma.department.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Department with code "${dto.code}" already exists`);
    }

    return this.prisma.department.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        isActive: dto.isActive ?? true,
      },
      include: { positions: true },
    });
  }

  async findAllDepartments(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    return this.prisma.department.findMany({
      where,
      include: { positions: true },
      orderBy: { name: 'asc' },
    });
  }

  async findDepartmentById(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: { positions: true },
    });
    if (!department) {
      throw new NotFoundException(`Department with id "${id}" not found`);
    }
    return department;
  }

  async updateDepartment(id: string, dto: UpdateDepartmentDto) {
    await this.findDepartmentById(id);

    if (dto.code) {
      const existing = await this.prisma.department.findFirst({
        where: { code: dto.code, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(`Department with code "${dto.code}" already exists`);
      }
    }

    return this.prisma.department.update({
      where: { id },
      data: dto,
      include: { positions: true },
    });
  }

  async deleteDepartment(id: string) {
    await this.findDepartmentById(id);
    // Soft-delete by setting isActive = false
    return this.prisma.department.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // === POSITIONS ===

  async createPosition(dto: CreatePositionDto) {
    // Verify department exists
    const department = await this.prisma.department.findUnique({
      where: { id: dto.departmentId },
    });
    if (!department) {
      throw new NotFoundException(`Department with id "${dto.departmentId}" not found`);
    }

    const existing = await this.prisma.position.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Position with code "${dto.code}" already exists`);
    }

    return this.prisma.position.create({
      data: {
        code: dto.code,
        name: dto.name,
        departmentId: dto.departmentId,
        level: dto.level ?? 1,
        isActive: dto.isActive ?? true,
      },
      include: { department: true },
    });
  }

  async findAllPositions(departmentId?: string, includeInactive = false) {
    const where: any = {};
    if (!includeInactive) where.isActive = true;
    if (departmentId) where.departmentId = departmentId;

    return this.prisma.position.findMany({
      where,
      include: { department: true },
      orderBy: [{ department: { name: 'asc' } }, { level: 'asc' }, { name: 'asc' }],
    });
  }

  async findPositionById(id: string) {
    const position = await this.prisma.position.findUnique({
      where: { id },
      include: { department: true },
    });
    if (!position) {
      throw new NotFoundException(`Position with id "${id}" not found`);
    }
    return position;
  }

  async updatePosition(id: string, dto: UpdatePositionDto) {
    await this.findPositionById(id);

    if (dto.departmentId) {
      const department = await this.prisma.department.findUnique({
        where: { id: dto.departmentId },
      });
      if (!department) {
        throw new NotFoundException(`Department with id "${dto.departmentId}" not found`);
      }
    }

    if (dto.code) {
      const existing = await this.prisma.position.findFirst({
        where: { code: dto.code, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(`Position with code "${dto.code}" already exists`);
      }
    }

    return this.prisma.position.update({
      where: { id },
      data: dto,
      include: { department: true },
    });
  }

  async deletePosition(id: string) {
    await this.findPositionById(id);
    // Soft-delete by setting isActive = false
    return this.prisma.position.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
