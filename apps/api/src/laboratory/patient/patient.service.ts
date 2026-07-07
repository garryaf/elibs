import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MrnGeneratorService } from './mrn-generator.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

@Injectable()
export class PatientService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mrnGenerator: MrnGeneratorService,
  ) {}

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

    // Generate MRN
    const mrn = await this.mrnGenerator.generate();

    // Create patient
    return this.prisma.patient.create({
      data: {
        mrn,
        nik: dto.nik,
        name: dto.name,
        dateOfBirth: new Date(dto.dateOfBirth),
        gender: dto.gender,
        phone: dto.phone,
        address: dto.address,
        email: dto.email,
        consentDigitalNotification: dto.consentDigitalNotification ?? false,
      },
    });
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
      }),
      this.prisma.patient.count({ where }),
    ]);

    return {
      data,
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
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }
    return patient;
  }

  async update(id: string, dto: UpdatePatientDto) {
    const patient = await this.prisma.patient.findFirst({
      where: { id, deletedAt: null },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    const data: any = { ...dto };
    if (dto.dateOfBirth) {
      data.dateOfBirth = new Date(dto.dateOfBirth);
    }

    return this.prisma.patient.update({
      where: { id },
      data,
    });
  }
}
