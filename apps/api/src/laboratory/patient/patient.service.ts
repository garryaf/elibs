import {
  Injectable,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MrnGeneratorService } from './mrn-generator.service';
import { RegionValidationService } from '../region/region-validation.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { AddPatientInsuranceDto, UpdatePatientInsuranceDto } from './dto/manage-patient-insurance.dto';

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

  private validateNikFormat(nik: string): void {
    if (!/^\d{16}$/.test(nik)) {
      throw new BadRequestException({
        errorCode: 'ERR_VALIDATION',
        message: 'NIK must be exactly 16 digits',
      });
    }
  }

  async register(dto: CreatePatientDto) {
    // Validate NIK format (defense-in-depth)
    this.validateNikFormat(dto.nik);

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

    // Create patient with P2002 unique constraint error handling
    try {
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
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const target = error.meta?.target as string[];
          if (target?.includes('nik')) {
            throw new ConflictException({
              errorCode: 'ERR_VALIDATION',
              message: 'Patient with this NIK already exists',
            });
          }
          if (target?.includes('mrn')) {
            throw new InternalServerErrorException({
              errorCode: 'ERR_INTERNAL',
              message: 'MRN generation conflict, please retry',
            });
          }
        }
      }
      throw error;
    }
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
      const searchConditions: any[] = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { mrn: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];

      // NIK: exact-prefix match (digits only)
      if (/^\d+$/.test(query.search)) {
        searchConditions.push({ nik: { startsWith: query.search } });
      }

      where.OR = searchConditions;
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

  // ─── Patient Insurance Management ──────────────────────────────────────────

  async getPatientInsurances(patientId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, deletedAt: null },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    const insurances = await this.prisma.patientInsurance.findMany({
      where: { patientId },
      include: {
        insurance: { select: { id: true, code: true, name: true, type: true, isActive: true } },
      },
      orderBy: { priority: 'asc' },
    });

    return { data: insurances };
  }

  async addPatientInsurance(patientId: string, dto: AddPatientInsuranceDto) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, deletedAt: null },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    // Validate insurance exists and is active
    const insurance = await this.prisma.insurance.findFirst({
      where: { id: dto.insuranceId, deletedAt: null, isActive: true },
    });
    if (!insurance) {
      throw new BadRequestException('Insurance not found or inactive');
    }

    // Validate priority range (1-5)
    if (dto.priority < 1 || dto.priority > 5) {
      throw new BadRequestException('Priority must be between 1 and 5');
    }

    // Check if this patient-insurance combination already exists
    const existing = await this.prisma.patientInsurance.findUnique({
      where: { patientId_insuranceId: { patientId, insuranceId: dto.insuranceId } },
    });
    if (existing) {
      throw new ConflictException('Patient already has this insurance assigned');
    }

    const patientInsurance = await this.prisma.patientInsurance.create({
      data: {
        patientId,
        insuranceId: dto.insuranceId,
        memberNumber: dto.memberNumber,
        policyNumber: dto.policyNumber,
        priority: dto.priority,
        type: dto.type,
        bpjsClassLevel: dto.bpjsClassLevel,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        notes: dto.notes,
      },
      include: {
        insurance: { select: { id: true, code: true, name: true, type: true } },
      },
    });

    return patientInsurance;
  }

  async updatePatientInsurance(patientInsuranceId: string, dto: UpdatePatientInsuranceDto) {
    const existing = await this.prisma.patientInsurance.findUnique({
      where: { id: patientInsuranceId },
    });
    if (!existing) {
      throw new NotFoundException('Patient insurance record not found');
    }

    const data: any = { ...dto };
    if (dto.validFrom) data.validFrom = new Date(dto.validFrom);
    if (dto.validUntil) data.validUntil = new Date(dto.validUntil);

    const updated = await this.prisma.patientInsurance.update({
      where: { id: patientInsuranceId },
      data,
      include: {
        insurance: { select: { id: true, code: true, name: true, type: true } },
      },
    });

    return updated;
  }

  async removePatientInsurance(patientInsuranceId: string) {
    const existing = await this.prisma.patientInsurance.findUnique({
      where: { id: patientInsuranceId },
    });
    if (!existing) {
      throw new NotFoundException('Patient insurance record not found');
    }

    await this.prisma.patientInsurance.delete({
      where: { id: patientInsuranceId },
    });

    return { success: true, message: 'Patient insurance removed' };
  }
}
