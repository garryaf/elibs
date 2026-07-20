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
import { AuditService } from '../audit/audit.service';
import { InsuranceConsolidationService } from '../../insurance/insurance-consolidation.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { AddPatientInsuranceDto, UpdatePatientInsuranceDto } from './dto/manage-patient-insurance.dto';
import { LabHistoryQueryDto } from './dto/lab-history-query.dto';

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
    private readonly auditService: AuditService,
    private readonly insuranceConsolidationService: InsuranceConsolidationService,
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

  async register(dto: CreatePatientDto, userId?: string) {
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
          // insuranceId is deprecated — use PatientInsurance junction instead
          consentDigitalNotification: dto.consentDigitalNotification ?? false,
        },
        include: REGION_INCLUDE,
      });

      // Create PatientInsurance junction record if insurance is provided
      if (dto.insuranceId) {
        await this.prisma.patientInsurance.create({
          data: {
            patientId: patient.id,
            insuranceId: dto.insuranceId,
            priority: 1,
            isActive: true,
            memberNumber: dto.memberNumber ?? null,
          },
        });
      }

      // Audit log patient creation
      if (userId) {
        await this.auditService.log(userId, 'CREATE', 'Patient', patient.id, null, { mrn, name: dto.name }, null);
      }

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

    // Enrich each patient with derived insuranceId and active insurances
    const enrichedData = await Promise.all(
      data.map(async (p) => {
        const transformed = this.transformRegionResponse(p);
        const resolvedInsuranceId = await this.insuranceConsolidationService.resolvePatientInsuranceId(p.id);
        const insurances = await this.insuranceConsolidationService.getActiveInsurances(p.id);
        return {
          ...transformed,
          insuranceId: resolvedInsuranceId,
          insurances,
        };
      }),
    );

    return {
      data: enrichedData,
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

    // Derive insuranceId from junction (priority=1) with legacy fallback
    const resolvedInsuranceId = await this.insuranceConsolidationService.resolvePatientInsuranceId(id);

    // Get active PatientInsurance records
    const insurances = await this.insuranceConsolidationService.getActiveInsurances(id);

    const transformed = this.transformRegionResponse(patient);
    return {
      ...transformed,
      insuranceId: resolvedInsuranceId,
      insurances,
    };
  }

  async update(id: string, dto: UpdatePatientDto, userId?: string) {
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

    // Extract insurance fields — handled via junction table, NOT Patient.insuranceId
    const { insuranceId, memberNumber, ...patientFields } = dto;

    const data: any = { ...patientFields };
    if (dto.dateOfBirth) {
      data.dateOfBirth = new Date(dto.dateOfBirth);
    }

    const updated = await this.prisma.patient.update({
      where: { id },
      data,
      include: REGION_INCLUDE,
    });

    // Handle insurance update via PatientInsurance junction table
    if (insuranceId !== undefined) {
      await this.upsertPatientInsuranceJunction(id, insuranceId, memberNumber);
    }

    // Audit log patient update
    if (userId) {
      await this.auditService.log(userId, 'UPDATE', 'Patient', id, null, dto as unknown as Record<string, unknown>, null);
    }

    return this.transformRegionResponse(updated);
  }

  /**
   * Upserts the PatientInsurance junction record with priority=1.
   * If a junction record already exists for this patient with priority=1:
   *   - If it belongs to this same insuranceId, update it (memberNumber if provided)
   *   - If it belongs to a different insuranceId, update the insuranceId (and memberNumber)
   * If no priority=1 record exists, create one.
   * Rejects with ERR_PRIORITY_CONFLICT if a unique constraint violation occurs.
   */
  private async upsertPatientInsuranceJunction(
    patientId: string,
    insuranceId: string,
    memberNumber?: string,
  ): Promise<void> {
    const existingPriority1 = await this.prisma.patientInsurance.findFirst({
      where: { patientId, priority: 1 },
    });

    if (existingPriority1) {
      // Update existing priority=1 record with new insurance info
      const updateData: any = { insuranceId };
      if (memberNumber !== undefined) {
        updateData.memberNumber = memberNumber;
      }

      try {
        await this.prisma.patientInsurance.update({
          where: { id: existingPriority1.id },
          data: updateData,
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new ConflictException({
            errorCode: 'ERR_PRIORITY_CONFLICT',
            message: 'Priority 1 already exists for this patient',
          });
        }
        throw error;
      }
    } else {
      // Create new PatientInsurance junction record with priority=1
      try {
        await this.prisma.patientInsurance.create({
          data: {
            patientId,
            insuranceId,
            priority: 1,
            isActive: true,
            memberNumber: memberNumber ?? null,
          },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          const target = (error.meta?.target as string[]) ?? [];
          if (target.includes('priority') || target.some((t) => t.includes('priority'))) {
            throw new ConflictException({
              errorCode: 'ERR_PRIORITY_CONFLICT',
              message: 'Priority 1 already exists for this patient',
            });
          }
          // Could be patientId_insuranceId unique constraint
          throw new ConflictException({
            errorCode: 'ERR_PRIORITY_CONFLICT',
            message: 'Priority 1 already exists for this patient',
          });
        }
        throw error;
      }
    }
  }

  // ─── Active Insurance Options ────────────────────────────────────────────

  async getActiveInsuranceOptions(patientId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, deletedAt: null },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    const insurances = await this.insuranceConsolidationService.getActiveInsurances(patientId);
    return { data: insurances };
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

    // Validate priority uniqueness per patient (only active records)
    const existingPriority = await this.prisma.patientInsurance.findFirst({
      where: { patientId, priority: dto.priority, isActive: true },
    });
    if (existingPriority) {
      throw new ConflictException({
        errorCode: 'ERR_PRIORITY_CONFLICT',
        message: `Priority ${dto.priority} already exists for this patient`,
      });
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

    // Validate priority uniqueness if priority is being changed (only active records)
    if (dto.priority !== undefined && dto.priority !== existing.priority) {
      const conflicting = await this.prisma.patientInsurance.findFirst({
        where: { patientId: existing.patientId, priority: dto.priority, isActive: true, id: { not: patientInsuranceId } },
      });
      if (conflicting) {
        throw new ConflictException({
          errorCode: 'ERR_PRIORITY_CONFLICT',
          message: `Priority ${dto.priority} already exists for this patient`,
        });
      }
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

  // ─── Patient Lab History ───────────────────────────────────────────────────

  async getLabHistory(patientId: string, query: LabHistoryQueryDto) {
    // Verify patient exists
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, deletedAt: null },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { patientId },
        include: {
          visit: { select: { visitNumber: true } },
          orderDetails: {
            include: { test: { select: { name: true } } },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where: { patientId } }),
    ]);

    const mapped = items.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt,
      visit: order.visit ? { visitNumber: order.visit.visitNumber } : null,
      orderDetails: order.orderDetails.map((d: any) => ({
        id: d.id,
        testName: d.test?.name ?? null,
        resultValue: d.resultValue,
        flag: d.flag,
        status: d.status,
      })),
    }));

    return {
      success: true,
      message: 'Lab history retrieved',
      data: {
        items: mapped,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async softDelete(id: string, userId: string, ipAddress?: string) {
    // 1. Verify patient exists and not already deleted
    const patient = await this.prisma.patient.findFirst({
      where: { id, deletedAt: null },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    // 2. Check for active visits (REGISTERED or IN_PROGRESS)
    const activeVisits = await this.prisma.visit.count({
      where: { patientId: id, status: { in: ['REGISTERED', 'IN_PROGRESS'] } },
    });
    if (activeVisits > 0) {
      throw new ConflictException('Cannot deactivate patient with active visits');
    }

    // 3. Check for active orders (not CANCELLED, not NOTIFIED)
    const activeOrders = await this.prisma.order.count({
      where: {
        patientId: id,
        status: { notIn: ['CANCELLED', 'NOTIFIED'] },
      },
    });
    if (activeOrders > 0) {
      throw new ConflictException('Cannot deactivate patient with active orders');
    }

    // 4. Soft-delete
    const updated = await this.prisma.patient.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // 5. Audit
    await this.auditService.log(
      userId,
      'SOFT_DELETE',
      'Patient',
      id,
      null,
      { deletedAt: updated.deletedAt },
      ipAddress,
    );

    return updated;
  }
}
