import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MrnGeneratorService } from './mrn-generator.service';
import { RegionValidationService } from '../region/region-validation.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

const REGION_INCLUDE = {
  provinsiRef: { select: { id: true, name: true } },
  kabupatenKotaRef: { select: { id: true, name: true } },
  kecamatanRef: { select: { id: true, name: true } },
  kelurahanDesaRef: { select: { id: true, name: true } },
};

@Injectable()
export class PatientService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mrnGenerator: MrnGeneratorService,
    private readonly regionValidationService: RegionValidationService,
  ) {}

  private transformRegionResponse(patient: any) {
    if (!patient) return patient;
    const { provinsiRef, kabupatenKotaRef, kecamatanRef, kelurahanDesaRef, ...rest } = patient;
    return {
      ...rest,
      provinsi: provinsiRef || null,
      kabupatenKota: kabupatenKotaRef || null,
      kecamatan: kecamatanRef || null,
      kelurahanDesa: kelurahanDesaRef || null,
    };
  }

  private hasAnyRegionId(dto: { provinsiId?: string; kabupatenKotaId?: string; kecamatanId?: string; kelurahanDesaId?: string }) {
    return !!(dto.provinsiId || dto.kabupatenKotaId || dto.kecamatanId || dto.kelurahanDesaId);
  }

  async register(dto: CreatePatientDto) {
    // Check NIK uniqueness
    const existingPatient = await this.prisma.patient.findFirst({
      where: { nik: dto.nik, deletedAt: null },
    });
    if (existingPatient) {
      throw new BadRequestException({
        errorCode: 'ERR_VALIDATION',
        message: 'NIK already registered',
      });
    }

    // Validate region hierarchy if any region ID is provided
    if (this.hasAnyRegionId(dto)) {
      await this.regionValidationService.validateHierarchy(
        dto.provinsiId,
        dto.kabupatenKotaId,
        dto.kecamatanId,
        dto.kelurahanDesaId,
      );
    }

    // Generate MRN
    const mrn = await this.mrnGenerator.generate();

    // Create patient
    const patient = await this.prisma.patient.create({
      data: {
        mrn,
        nik: dto.nik,
        name: dto.name,
        dateOfBirth: new Date(dto.dateOfBirth),
        gender: dto.gender,
        phone: dto.phone,
        address: dto.address,
        email: dto.email,
        province: dto.province,
        city: dto.city,
        district: dto.district,
        village: dto.village,
        postalCode: dto.postalCode,
        provinsiId: dto.provinsiId,
        kabupatenKotaId: dto.kabupatenKotaId,
        kecamatanId: dto.kecamatanId,
        kelurahanDesaId: dto.kelurahanDesaId,
        bloodType: dto.bloodType,
        emergencyContact: dto.emergencyContact,
        emergencyPhone: dto.emergencyPhone,
        insuranceId: dto.insuranceId,
        consentDigitalNotification: dto.consentDigitalNotification ?? false,
      },
      include: REGION_INCLUDE,
    });

    return this.transformRegionResponse(patient);
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    const where: any = { deletedAt: null };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { nik: { contains: query.search } },
        { mrn: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: REGION_INCLUDE,
      }),
      this.prisma.patient.count({ where }),
    ]);

    return {
      data: data.map((p) => this.transformRegionResponse(p)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id, deletedAt: null },
      include: REGION_INCLUDE,
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }
    return this.transformRegionResponse(patient);
  }

  async update(id: string, dto: UpdatePatientDto) {
    const patient = await this.prisma.patient.findFirst({
      where: { id, deletedAt: null },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    // Validate region hierarchy if any region ID is provided
    if (this.hasAnyRegionId(dto)) {
      await this.regionValidationService.validateHierarchy(
        dto.provinsiId,
        dto.kabupatenKotaId,
        dto.kecamatanId,
        dto.kelurahanDesaId,
      );
    }

    const data: any = { ...dto };
    if (dto.dateOfBirth) {
      data.dateOfBirth = new Date(dto.dateOfBirth);
    }

    const updated = await this.prisma.patient.update({
      where: { id },
      data,
      include: REGION_INCLUDE,
    });

    return this.transformRegionResponse(updated);
  }
}
