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
import {
  AddPatientInsuranceDto,
  UpdatePatientInsuranceDto,
} from './dto/manage-patient-insurance.dto';
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
    const {
      provinsiRef,
      kabupatenKotaRef,
      kecamatanRef,
      kelurahanDesaRef,
      visits,
      ...rest
    } = patient;
    const lastVisitDate = visits?.[0]?.registrationDate
      ? new Date(visits[0].registrationDate).toISOString()
      : null;
    return {
      ...rest,
      lastVisitDate,
      lastVisit: lastVisitDate,
      provinsi: provinsiRef || null,
      kabupatenKota: kabupatenKotaRef || null,
      kecamatan: kecamatanRef || null,
      kelurahanDesa: kelurahanDesaRef || null,
    };
  }

  private hasAnyRegionId(dto: {
    provinsiId?: string;
    kabupatenKotaId?: string;
    kecamatanId?: string;
    kelurahanDesaId?: string;
  }) {
    return !!(
      dto.provinsiId ||
      dto.kabupatenKotaId ||
      dto.kecamatanId ||
      dto.kelurahanDesaId
    );
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
        await this.auditService.log(
          userId,
          'CREATE',
          'Patient',
          patient.id,
          null,
          { mrn, name: dto.name },
          null,
        );
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
    status?: string;
    gender?: string;
    ageMin?: number;
    ageMax?: number;
    registeredFrom?: string;
    registeredTo?: string;
    lastVisitFrom?: string;
    lastVisitTo?: string;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    const where: any = {};

    if (query.status === 'ACTIVE') {
      where.deletedAt = null;
    } else if (query.status === 'INACTIVE') {
      where.deletedAt = { not: null };
    }

    // Gender filter
    if (
      query.gender &&
      (query.gender === 'MALE' || query.gender === 'FEMALE')
    ) {
      where.gender = query.gender;
    }

    // Age filter — convert age range to dateOfBirth range
    if (query.ageMin !== undefined || query.ageMax !== undefined) {
      const today = new Date();
      const dobCondition: any = {};
      if (query.ageMin !== undefined) {
        // ageMin years old → born on or before today minus ageMin years
        const maxDob = new Date(
          today.getFullYear() - query.ageMin,
          today.getMonth(),
          today.getDate(),
        );
        dobCondition.lte = maxDob;
      }
      if (query.ageMax !== undefined) {
        // ageMax years old → born on or after today minus (ageMax + 1) years
        const minDob = new Date(
          today.getFullYear() - query.ageMax - 1,
          today.getMonth(),
          today.getDate() + 1,
        );
        dobCondition.gte = minDob;
      }
      if (Object.keys(dobCondition).length > 0) {
        where.dateOfBirth = dobCondition;
      }
    }

    // Registration date filter
    if (query.registeredFrom || query.registeredTo) {
      const createdAtCondition: any = {};
      if (query.registeredFrom)
        createdAtCondition.gte = new Date(query.registeredFrom);
      if (query.registeredTo) {
        const endDate = new Date(query.registeredTo);
        endDate.setHours(23, 59, 59, 999);
        createdAtCondition.lte = endDate;
      }
      where.createdAt = createdAtCondition;
    }

    // Last visit filter — requires subquery on visits relation
    if (query.lastVisitFrom || query.lastVisitTo) {
      const visitCondition: any = { cancelledAt: null };
      if (query.lastVisitFrom)
        visitCondition.registrationDate = {
          ...visitCondition.registrationDate,
          gte: new Date(query.lastVisitFrom),
        };
      if (query.lastVisitTo) {
        const endDate = new Date(query.lastVisitTo);
        endDate.setHours(23, 59, 59, 999);
        visitCondition.registrationDate = {
          ...visitCondition.registrationDate,
          lte: endDate,
        };
      }
      where.visits = { some: visitCondition };
    }

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

    const countWhereBase = { ...where };
    delete countWhereBase.deletedAt;

    const [data, total, activeCount, inactiveCount] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          ...REGION_INCLUDE,
          visits: {
            where: { cancelledAt: null },
            orderBy: { registrationDate: 'desc' },
            take: 1,
            select: { registrationDate: true, status: true },
          },
          orders: {
            where: { status: { notIn: ['CANCELLED', 'APPROVED', 'NOTIFIED'] } },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { status: true, orderNumber: true },
          },
        },
      }),
      this.prisma.patient.count({ where }),
      this.prisma.patient.count({
        where: { ...countWhereBase, deletedAt: null },
      }),
      this.prisma.patient.count({
        where: { ...countWhereBase, deletedAt: { not: null } },
      }),
    ]);

    // Enrich each patient with derived insuranceId and active insurances
    const enrichedData = await Promise.all(
      data.map(async (p) => {
        const transformed = this.transformRegionResponse(p);
        const resolvedInsuranceId =
          await this.insuranceConsolidationService.resolvePatientInsuranceId(
            p.id,
          );
        const insurances =
          await this.insuranceConsolidationService.getActiveInsurances(p.id);

        // Derive visit/order state for table display
        const latestVisit = (p as any).visits?.[0] ?? null;
        const latestActiveOrder = (p as any).orders?.[0] ?? null;

        return {
          ...transformed,
          insuranceId: resolvedInsuranceId,
          insurances,
          // BP-05: expose visit/order state for table UI
          activeVisitStatus: latestVisit?.status ?? null,
          lastVisitDate: latestVisit?.registrationDate ?? null,
          activeOrderStatus: latestActiveOrder?.status ?? null,
          activeOrderNumber: latestActiveOrder?.orderNumber ?? null,
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
        activeCount,
        inactiveCount,
      },
    };
  }

  async findById(id: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id, deletedAt: null },
      include: {
        ...REGION_INCLUDE,
        visits: {
          where: { cancelledAt: null },
          orderBy: { registrationDate: 'desc' },
          take: 1,
          select: { registrationDate: true },
        },
      },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    // Derive insuranceId from junction (priority=1) with legacy fallback
    const resolvedInsuranceId =
      await this.insuranceConsolidationService.resolvePatientInsuranceId(id);

    // Get active PatientInsurance records
    const insurances =
      await this.insuranceConsolidationService.getActiveInsurances(id);

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
      await this.auditService.log(
        userId,
        'UPDATE',
        'Patient',
        id,
        null,
        dto as unknown as Record<string, unknown>,
        null,
      );
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
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
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
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          const target = (error.meta?.target as string[]) ?? [];
          if (
            target.includes('priority') ||
            target.some((t) => t.includes('priority'))
          ) {
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

    const insurances =
      await this.insuranceConsolidationService.getActiveInsurances(patientId);
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
        insurance: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            isActive: true,
          },
        },
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
      where: {
        patientId_insuranceId: { patientId, insuranceId: dto.insuranceId },
      },
    });
    if (existing) {
      throw new ConflictException(
        'Patient already has this insurance assigned',
      );
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

  async updatePatientInsurance(
    patientInsuranceId: string,
    dto: UpdatePatientInsuranceDto,
  ) {
    const existing = await this.prisma.patientInsurance.findUnique({
      where: { id: patientInsuranceId },
    });
    if (!existing) {
      throw new NotFoundException('Patient insurance record not found');
    }

    // Validate priority uniqueness if priority is being changed (only active records)
    if (dto.priority !== undefined && dto.priority !== existing.priority) {
      const conflicting = await this.prisma.patientInsurance.findFirst({
        where: {
          patientId: existing.patientId,
          priority: dto.priority,
          isActive: true,
          id: { not: patientInsuranceId },
        },
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
      throw new ConflictException(
        'Cannot deactivate patient with active visits',
      );
    }

    // 3. Check for active orders (not CANCELLED, not NOTIFIED)
    const activeOrders = await this.prisma.order.count({
      where: {
        patientId: id,
        status: { notIn: ['CANCELLED', 'NOTIFIED'] },
      },
    });
    if (activeOrders > 0) {
      throw new ConflictException(
        'Cannot deactivate patient with active orders',
      );
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

  async reactivate(id: string, userId: string, ipAddress?: string) {
    // 1. Verify patient exists and IS currently deactivated
    const patient = await this.prisma.patient.findFirst({
      where: { id, deletedAt: { not: null } },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found or already active');
    }

    // 2. Reactivate — set deletedAt back to null
    const updated = await this.prisma.patient.update({
      where: { id },
      data: { deletedAt: null },
    });

    // 3. Audit
    await this.auditService.log(
      userId,
      'REACTIVATE',
      'Patient',
      id,
      { deletedAt: patient.deletedAt },
      { deletedAt: null },
      ipAddress,
    );

    return updated;
  }

  // ─── BP-06: Duplicate Detection & Merge ─────────────────────────────────────

  /**
   * Detect potential duplicate patients by name similarity or NIK prefix.
   */
  async findDuplicates(query: { search?: string; limit?: number }) {
    const limit = query.limit || 20;

    // Find patients with similar names using case-insensitive partial match
    // This identifies groups of patients that could be duplicates
    const patients = await this.prisma.patient.findMany({
      where: {
        deletedAt: null,
        ...(query.search
          ? {
              OR: [
                { name: { contains: query.search, mode: 'insensitive' } },
                { nik: { startsWith: query.search } },
              ],
            }
          : {}),
      },
      take: limit,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        mrn: true,
        nik: true,
        name: true,
        dateOfBirth: true,
        gender: true,
        phone: true,
        createdAt: true,
        _count: { select: { orders: true, visits: true } },
      },
    });

    return patients;
  }

  /**
   * Merge patient B into patient A.
   * All visits, orders, insurances from B are reassigned to A.
   * Patient B is then soft-deleted.
   */
  async mergePatients(
    primaryId: string,
    secondaryId: string,
    userId: string,
    ipAddress?: string,
  ) {
    if (primaryId === secondaryId) {
      throw new BadRequestException('Cannot merge a patient into themselves');
    }

    // Verify both patients exist
    const [primary, secondary] = await Promise.all([
      this.prisma.patient.findFirst({
        where: { id: primaryId, deletedAt: null },
      }),
      this.prisma.patient.findFirst({
        where: { id: secondaryId, deletedAt: null },
      }),
    ]);

    if (!primary) throw new NotFoundException('Primary patient not found');
    if (!secondary) throw new NotFoundException('Secondary patient not found');

    // Execute merge in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Reassign all visits from secondary to primary
      const visitUpdate = await tx.visit.updateMany({
        where: { patientId: secondaryId },
        data: { patientId: primaryId },
      });

      // 2. Reassign all orders from secondary to primary
      const orderUpdate = await tx.order.updateMany({
        where: { patientId: secondaryId },
        data: { patientId: primaryId },
      });

      // 3. Reassign patient insurances (skip if primary already has same insurance)
      const primaryInsurances = await tx.patientInsurance.findMany({
        where: { patientId: primaryId },
        select: { insuranceId: true },
      });
      const primaryInsuranceIds = new Set(
        primaryInsurances.map((i) => i.insuranceId),
      );

      const secondaryInsurances = await tx.patientInsurance.findMany({
        where: { patientId: secondaryId },
      });

      let insuranceMerged = 0;
      for (const si of secondaryInsurances) {
        if (primaryInsuranceIds.has(si.insuranceId)) {
          // Duplicate — delete the secondary's insurance record
          await tx.patientInsurance.delete({ where: { id: si.id } });
        } else {
          // Move to primary with next available priority
          const maxPriority = await tx.patientInsurance.findFirst({
            where: { patientId: primaryId },
            orderBy: { priority: 'desc' },
            select: { priority: true },
          });
          await tx.patientInsurance.update({
            where: { id: si.id },
            data: {
              patientId: primaryId,
              priority: (maxPriority?.priority || 0) + 1,
            },
          });
          insuranceMerged++;
        }
      }

      // 4. Soft-delete the secondary patient
      await tx.patient.update({
        where: { id: secondaryId },
        data: { deletedAt: new Date() },
      });

      return {
        visitsMerged: visitUpdate.count,
        ordersMerged: orderUpdate.count,
        insurancesMerged: insuranceMerged,
      };
    });

    // 5. Audit log
    await this.auditService.log(
      userId,
      'MERGE_PATIENT',
      'Patient',
      primaryId,
      {
        secondaryPatientId: secondaryId,
        secondaryMrn: secondary.mrn,
        secondaryName: secondary.name,
      },
      { ...result, mergedInto: primaryId },
      ipAddress,
    );

    return {
      primaryPatient: { id: primary.id, mrn: primary.mrn, name: primary.name },
      mergedFrom: {
        id: secondary.id,
        mrn: secondary.mrn,
        name: secondary.name,
      },
      ...result,
    };
  }
}
