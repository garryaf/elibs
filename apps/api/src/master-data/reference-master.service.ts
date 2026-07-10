import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

type EntityType =
  | 'doctor'
  | 'clinic'
  | 'insurance'
  | 'equipment'
  | 'reagent'
  | 'sampleTypeMaster'
  | 'measurementUnit';

/**
 * Generic service for CRUD operations on reference/master data.
 * All entities follow the same pattern: code, name, isActive, soft-delete.
 */
@Injectable()
export class ReferenceMasterService {
  constructor(private readonly prisma: PrismaService) {}

  private getModel(entity: EntityType) {
    return (this.prisma as any)[entity];
  }

  private hasSoftDelete(entity: EntityType): boolean {
    return !['measurementUnit'].includes(entity);
  }

  async findAll(
    entity: EntityType,
    query: { page?: string; limit?: string; search?: string },
  ) {
    const model = this.getModel(entity);
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (this.hasSoftDelete(entity)) {
      where.deletedAt = null;
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      model.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      model.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async create(entity: EntityType, dto: any) {
    const model = this.getModel(entity);
    return model.create({ data: dto });
  }

  async update(entity: EntityType, id: string, dto: any) {
    const model = this.getModel(entity);
    const existing = await model.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`${entity} not found`);
    }
    return model.update({ where: { id }, data: dto });
  }

  async softDelete(entity: EntityType, id: string) {
    const model = this.getModel(entity);
    const existing = await model.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`${entity} not found`);
    }

    if (this.hasSoftDelete(entity)) {
      return model.update({ where: { id }, data: { deletedAt: new Date() } });
    } else {
      return model.delete({ where: { id } });
    }
  }
}
