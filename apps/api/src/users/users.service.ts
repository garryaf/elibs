import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { User } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

// Fields to select when returning user data (excludes passwordHash)
const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  departmentId: true,
  positionId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email, deletedAt: null } });
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    return this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        role: dto.role,
      },
      select: userSelect,
    });
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
    role?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: userSelect,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit },
    };
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id, deletedAt: null },
      select: userSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findById(id);

    // Check email uniqueness if email is being updated
    if (dto.email) {
      const existing = await this.prisma.user.findFirst({
        where: { email: dto.email, id: { not: id }, deletedAt: null },
      });
      if (existing) {
        throw new ConflictException('Email already in use');
      }
    }

    const data: any = {};
    if (dto.email) data.email = dto.email;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.role) data.role = dto.role;
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 12);
    }
    if (dto.departmentId !== undefined) data.departmentId = dto.departmentId;
    if (dto.positionId !== undefined) data.positionId = dto.positionId;

    return this.prisma.user.update({
      where: { id },
      data,
      select: userSelect,
    });
  }

  async softDelete(id: string) {
    await this.findById(id);

    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: userSelect,
    });
  }
}
