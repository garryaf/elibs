import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { stringify } from 'csv-stringify/sync';

export type ExportEntityType =
  | 'tests'
  | 'tariffs'
  | 'panels'
  | 'doctors'
  | 'clinics';

@Injectable()
export class BulkExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportCsv(entityType: ExportEntityType): Promise<Buffer> {
    const records = await this.fetchActiveRecords(entityType);

    if (records.length === 0) {
      throw new BadRequestException(
        `No active records found for entity type '${entityType}'`,
      );
    }

    const csvContent = stringify(records, {
      header: true,
      cast: {
        date: (value: Date) => value.toISOString(),
        boolean: (value: boolean) => (value ? 'true' : 'false'),
      },
    });

    return Buffer.from(csvContent, 'utf-8');
  }

  private async fetchActiveRecords(
    entityType: ExportEntityType,
  ): Promise<Record<string, any>[]> {
    switch (entityType) {
      case 'tests':
        return this.fetchTests();
      case 'tariffs':
        return this.fetchTariffs();
      case 'panels':
        return this.fetchPanels();
      case 'doctors':
        return this.fetchDoctors();
      case 'clinics':
        return this.fetchClinics();
      default:
        throw new BadRequestException(
          `Unsupported entity type: ${entityType}`,
        );
    }
  }

  private async fetchTests(): Promise<Record<string, any>[]> {
    const tests = await this.prisma.testMaster.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { code: 'asc' },
    });

    return tests.map((t) => ({
      code: t.code,
      name: t.name,
      categoryId: t.categoryId,
      unit: t.unit || '',
      method: t.method || '',
      sampleType: t.sampleType || '',
      price: Number(t.price),
      requiresDoctorApproval: t.requiresDoctorApproval,
      isActive: t.isActive,
    }));
  }

  private async fetchTariffs(): Promise<Record<string, any>[]> {
    const tariffs = await this.prisma.tariff.findMany({
      where: {
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date() } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    return tariffs.map((t) => ({
      testId: t.testId,
      clinicId: t.clinicId || '',
      insuranceId: t.insuranceId || '',
      price: Number(t.price),
      discount: Number(t.discount),
      effectiveFrom: t.effectiveFrom,
      effectiveTo: t.effectiveTo || '',
    }));
  }

  private async fetchPanels(): Promise<Record<string, any>[]> {
    const panels = await this.prisma.panel.findMany({
      where: { isActive: true, deletedAt: null },
      include: { panelTests: { select: { testId: true } } },
      orderBy: { name: 'asc' },
    });

    return panels.map((p) => ({
      name: p.name,
      description: p.description || '',
      price: Number(p.price),
      isActive: p.isActive,
      testIds: p.panelTests.map((pt) => pt.testId).join(';'),
    }));
  }

  private async fetchDoctors(): Promise<Record<string, any>[]> {
    const doctors = await this.prisma.doctor.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { code: 'asc' },
    });

    return doctors.map((d) => ({
      code: d.code,
      name: d.name,
      specialization: d.specialization || '',
      phone: d.phone || '',
      email: d.email || '',
      licenseNumber: d.licenseNumber || '',
      isActive: d.isActive,
    }));
  }

  private async fetchClinics(): Promise<Record<string, any>[]> {
    const clinics = await this.prisma.clinic.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { code: 'asc' },
    });

    return clinics.map((c) => ({
      code: c.code,
      name: c.name,
      address: c.address || '',
      phone: c.phone || '',
      email: c.email || '',
      isActive: c.isActive,
    }));
  }
}
