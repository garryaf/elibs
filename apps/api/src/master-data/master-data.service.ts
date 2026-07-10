import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateTestCategoryDto } from './dto/create-test-category.dto';
import { UpdateTestCategoryDto } from './dto/update-test-category.dto';
import { CreateTestDto } from './dto/create-test.dto';
import { UpdateTestDto } from './dto/update-test.dto';
import { CreatePanelDto } from './dto/create-panel.dto';
import { UpdatePanelDto } from './dto/update-panel.dto';
import { CreateTariffDto } from './dto/create-tariff.dto';
import { UpdateTariffDto } from './dto/update-tariff.dto';
import {
  IMasterDataQueryService,
  TestMasterView,
  TariffView,
  ReferenceValueView,
  InsuranceView,
} from './interfaces/master-data-query.interface';
import { TariffResolverService } from './tariff-resolver.service';

@Injectable()
export class MasterDataService implements IMasterDataQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tariffResolver: TariffResolverService,
  ) {}

  // ─── Test Categories ─────────────────────────────────────────────────────────

  async findAllCategories(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.testCategory.findMany({
        where: { deletedAt: null },
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.testCategory.count({ where: { deletedAt: null } }),
    ]);
    return { data, meta: { total, page, limit } };
  }

  async createCategory(dto: CreateTestCategoryDto) {
    try {
      return await this.prisma.testCategory.create({
        data: {
          name: dto.name,
          description: dto.description,
          isActive: dto.isActive ?? true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Record with this name/code already exists');
      }
      throw error;
    }
  }

  async updateCategory(id: string, dto: UpdateTestCategoryDto) {
    const category = await this.prisma.testCategory.findFirst({
      where: { id, deletedAt: null },
    });
    if (!category) {
      throw new NotFoundException('Test category not found');
    }
    return this.prisma.testCategory.update({
      where: { id },
      data: dto,
    });
  }

  async softDeleteCategory(id: string) {
    const category = await this.prisma.testCategory.findFirst({
      where: { id, deletedAt: null },
    });
    if (!category) {
      throw new NotFoundException('Test category not found');
    }
    return this.prisma.testCategory.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ─── Test Master ──────────────────────────────────────────────────────────────

  async findAllTests(page = 1, limit = 20, categoryId?: string) {
    const skip = (page - 1) * limit;
    const where: any = { deletedAt: null };
    if (categoryId) {
      where.categoryId = categoryId;
    }
    const [data, total] = await Promise.all([
      this.prisma.testMaster.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: { category: true, referenceValues: true },
      }),
      this.prisma.testMaster.count({ where }),
    ]);
    return { data, meta: { total, page, limit } };
  }

  async createTest(dto: CreateTestDto) {
    // Validate unique code across non-deleted records
    const existing = await this.prisma.testMaster.findFirst({
      where: { code: dto.code, deletedAt: null },
    });
    if (existing) {
      throw new BadRequestException({
        errorCode: 'ERR_DUPLICATE_CODE',
        message: `Test code '${dto.code}' already exists`,
      });
    }

    try {
      return await this.prisma.testMaster.create({
        data: {
          code: dto.code,
          name: dto.name,
          categoryId: dto.categoryId,
          unit: dto.unit,
          method: dto.method,
          sampleType: dto.sampleType,
          price: dto.price,
          requiresDoctorApproval: dto.requiresDoctorApproval ?? true,
          isActive: dto.isActive ?? true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Record with this name/code already exists');
      }
      throw error;
    }
  }

  async updateTest(id: string, dto: UpdateTestDto) {
    const test = await this.prisma.testMaster.findFirst({
      where: { id, deletedAt: null },
    });
    if (!test) {
      throw new NotFoundException('Test not found');
    }

    // Validate unique code if code is being updated
    if (dto.code && dto.code !== test.code) {
      const existing = await this.prisma.testMaster.findFirst({
        where: { code: dto.code, deletedAt: null, id: { not: id } },
      });
      if (existing) {
        throw new BadRequestException({
          errorCode: 'ERR_DUPLICATE_CODE',
          message: `Test code '${dto.code}' already exists`,
        });
      }
    }

    return this.prisma.testMaster.update({
      where: { id },
      data: dto,
    });
  }

  async softDeleteTest(id: string) {
    const test = await this.prisma.testMaster.findFirst({
      where: { id, deletedAt: null },
    });
    if (!test) {
      throw new NotFoundException('Test not found');
    }

    // Check for active OrderDetail references
    const activeReferences = await this.prisma.orderDetail.count({
      where: { testId: id },
    });
    if (activeReferences > 0) {
      throw new BadRequestException({
        errorCode: 'ERR_REFERENCE_CONFLICT',
        message:
          'Cannot delete test with active order references. Deactivate it instead.',
      });
    }

    return this.prisma.testMaster.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ─── Panels ───────────────────────────────────────────────────────────────────

  async findAllPanels(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.panel.findMany({
        where: { deletedAt: null },
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: { panelTests: { include: { test: true } } },
      }),
      this.prisma.panel.count({ where: { deletedAt: null } }),
    ]);
    return { data, meta: { total, page, limit } };
  }

  async createPanel(dto: CreatePanelDto) {
    return this.prisma.panel.create({
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        isActive: dto.isActive ?? true,
        panelTests: {
          create: dto.testIds.map((testId) => ({ testId })),
        },
      },
      include: { panelTests: { include: { test: true } } },
    });
  }

  async updatePanel(id: string, dto: UpdatePanelDto) {
    const panel = await this.prisma.panel.findFirst({
      where: { id, deletedAt: null },
    });
    if (!panel) {
      throw new NotFoundException('Panel not found');
    }

    // If testIds are provided, replace the panel tests
    if (dto.testIds) {
      await this.prisma.panelTest.deleteMany({ where: { panelId: id } });
      await this.prisma.panelTest.createMany({
        data: dto.testIds.map((testId) => ({ panelId: id, testId })),
      });
    }

    const { testIds, ...updateData } = dto;
    return this.prisma.panel.update({
      where: { id },
      data: updateData,
      include: { panelTests: { include: { test: true } } },
    });
  }

  async softDeletePanel(id: string) {
    const panel = await this.prisma.panel.findFirst({
      where: { id, deletedAt: null },
    });
    if (!panel) {
      throw new NotFoundException('Panel not found');
    }

    return this.prisma.panel.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ─── Tariffs ──────────────────────────────────────────────────────────────────

  async findAllTariffs(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.tariff.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { test: true },
      }),
      this.prisma.tariff.count(),
    ]);
    return { data, meta: { total, page, limit } };
  }

  async createTariff(dto: CreateTariffDto) {
    return this.prisma.tariff.create({
      data: {
        testId: dto.testId,
        clinicId: dto.clinicId ?? null,
        insuranceId: dto.insuranceId ?? null,
        price: dto.price,
        discount: dto.discount ?? 0,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
      },
      include: { test: true },
    });
  }

  async updateTariff(id: string, dto: UpdateTariffDto) {
    const tariff = await this.prisma.tariff.findUnique({
      where: { id },
    });
    if (!tariff) {
      throw new NotFoundException('Tariff not found');
    }

    // If changing the unique combination, validate uniqueness
    const newTestId = dto.testId ?? tariff.testId;
    const newClinicId = dto.clinicId !== undefined ? dto.clinicId : tariff.clinicId;
    const newInsuranceId =
      dto.insuranceId !== undefined ? dto.insuranceId : tariff.insuranceId;
    const newEffectiveFrom = dto.effectiveFrom
      ? new Date(dto.effectiveFrom)
      : tariff.effectiveFrom;

    if (
      newTestId !== tariff.testId ||
      newClinicId !== tariff.clinicId ||
      newInsuranceId !== tariff.insuranceId ||
      newEffectiveFrom.getTime() !== tariff.effectiveFrom.getTime()
    ) {
      const existing = await this.prisma.tariff.findFirst({
        where: {
          testId: newTestId,
          clinicId: newClinicId ?? null,
          insuranceId: newInsuranceId ?? null,
          effectiveFrom: newEffectiveFrom,
          id: { not: id },
        },
      });
      if (existing) {
        throw new BadRequestException({
          errorCode: 'ERR_DUPLICATE_TARIFF',
          message:
            'A tariff with this combination of testId, clinicId, insuranceId, and effectiveFrom already exists',
        });
      }
    }

    return this.prisma.tariff.update({
      where: { id },
      data: {
        testId: dto.testId,
        clinicId: dto.clinicId,
        insuranceId: dto.insuranceId,
        price: dto.price,
        discount: dto.discount,
        effectiveFrom: dto.effectiveFrom
          ? new Date(dto.effectiveFrom)
          : undefined,
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
      },
      include: { test: true },
    });
  }

  async deleteTariff(id: string) {
    const tariff = await this.prisma.tariff.findUnique({
      where: { id },
    });
    if (!tariff) {
      throw new NotFoundException('Tariff not found');
    }

    return this.prisma.tariff.delete({
      where: { id },
    });
  }

  // ─── IMasterDataQueryService Implementation ────────────────────────────────────

  async findTestById(testId: string): Promise<TestMasterView | null> {
    const test = await this.prisma.testMaster.findFirst({
      where: { id: testId, deletedAt: null },
    });
    if (!test) return null;
    return this.mapToTestMasterView(test);
  }

  async findTestsByIds(testIds: string[]): Promise<TestMasterView[]> {
    const tests = await this.prisma.testMaster.findMany({
      where: { id: { in: testIds }, deletedAt: null },
    });
    return tests.map((t) => this.mapToTestMasterView(t));
  }

  async findActiveTests(filters?: {
    categoryId?: string;
    isActive?: boolean;
  }): Promise<TestMasterView[]> {
    const where: any = { deletedAt: null };
    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    } else {
      where.isActive = true;
    }

    const tests = await this.prisma.testMaster.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    return tests.map((t) => this.mapToTestMasterView(t));
  }

  async resolveTariff(
    testId: string,
    clinicId?: string,
    insuranceId?: string,
  ): Promise<TariffView | null> {
    const tariff = await this.tariffResolver.getActiveTariff(
      testId,
      clinicId,
      insuranceId,
    );
    if (!tariff) return null;
    return {
      id: tariff.id,
      testId: tariff.testId,
      clinicId: tariff.clinicId,
      insuranceId: tariff.insuranceId,
      price: Number(tariff.price),
      discount: Number(tariff.discount),
      effectiveFrom: tariff.effectiveFrom,
      effectiveTo: tariff.effectiveTo,
    };
  }

  async findReferenceValues(testId: string): Promise<ReferenceValueView[]> {
    const refs = await this.prisma.referenceValue.findMany({
      where: { testId },
    });
    return refs.map((r) => ({
      id: r.id,
      testId: r.testId,
      gender: r.gender,
      minAge: r.minAge,
      maxAge: r.maxAge,
      minRef: Number(r.minRef),
      maxRef: Number(r.maxRef),
      criticalMin: r.criticalMin != null ? Number(r.criticalMin) : null,
      criticalMax: r.criticalMax != null ? Number(r.criticalMax) : null,
    }));
  }

  async findInsuranceById(insuranceId: string): Promise<InsuranceView | null> {
    const ins = await this.prisma.insurance.findFirst({
      where: { id: insuranceId, deletedAt: null },
    });
    if (!ins) return null;
    return {
      id: ins.id,
      code: ins.code,
      name: ins.name,
      isActive: ins.isActive,
    };
  }

  async findActiveInsurances(): Promise<InsuranceView[]> {
    const insurances = await this.prisma.insurance.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { name: 'asc' },
    });
    return insurances.map((ins) => ({
      id: ins.id,
      code: ins.code,
      name: ins.name,
      isActive: ins.isActive,
    }));
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────────

  private mapToTestMasterView(test: any): TestMasterView {
    return {
      id: test.id,
      code: test.code,
      name: test.name,
      categoryId: test.categoryId,
      unit: test.unit ?? null,
      sampleType: test.sampleType ?? null,
      price: Number(test.price),
      requiresDoctorApproval: test.requiresDoctorApproval,
      isActive: test.isActive,
    };
  }
}
