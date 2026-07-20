import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PaginatedResult } from '../../common/interfaces/pagination.interface';

export interface RegionItem {
  id: string;
  name: string;
  parentId?: string;
  postalCode?: string;
}

@Injectable()
export class RegionService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllProvinsi(
    page = 1,
    limit = 50,
    search?: string,
  ): Promise<PaginatedResult<RegionItem>> {
    const skip = (page - 1) * limit;

    const where: any = { isActive: true };
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.provinsi.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      }),
      this.prisma.provinsi.count({ where }),
    ]);

    return {
      data: data.map((item) => ({ id: item.id, name: item.name })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findKabupatenKotaByProvinsi(
    provinsiId: string,
    page = 1,
    limit = 50,
    search?: string,
  ): Promise<PaginatedResult<RegionItem>> {
    const skip = (page - 1) * limit;

    const where: any = { isActive: true, provinsiId };
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.kabupatenKota.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        select: { id: true, name: true, provinsiId: true },
      }),
      this.prisma.kabupatenKota.count({ where }),
    ]);

    return {
      data: data.map((item) => ({
        id: item.id,
        name: item.name,
        parentId: item.provinsiId,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findKecamatanByKabupatenKota(
    kabupatenKotaId: string,
    page = 1,
    limit = 50,
    search?: string,
  ): Promise<PaginatedResult<RegionItem>> {
    const skip = (page - 1) * limit;

    const where: any = { isActive: true, kabupatenKotaId };
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.kecamatan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        select: { id: true, name: true, kabupatenKotaId: true },
      }),
      this.prisma.kecamatan.count({ where }),
    ]);

    return {
      data: data.map((item) => ({
        id: item.id,
        name: item.name,
        parentId: item.kabupatenKotaId,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findKelurahanDesaByKecamatan(
    kecamatanId: string,
    page = 1,
    limit = 50,
    search?: string,
  ): Promise<PaginatedResult<RegionItem>> {
    const skip = (page - 1) * limit;

    const where: any = { isActive: true, kecamatanId };
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.kelurahanDesa.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        select: { id: true, name: true, kecamatanId: true, postalCode: true },
      }),
      this.prisma.kelurahanDesa.count({ where }),
    ]);

    return {
      data: data.map((item) => ({
        id: item.id,
        name: item.name,
        parentId: item.kecamatanId,
        postalCode: item.postalCode ?? undefined,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
