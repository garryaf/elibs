import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { ServiceLayerInspector } from '../inspectors/service-layer.inspector';
import { RepositoryLayerInspector } from '../inspectors/repository-layer.inspector';
import { InspectionTarget } from '../interfaces';

describe('ServiceLayerInspector', () => {
  let inspector: ServiceLayerInspector;
  let tmpDir: string;

  beforeEach(() => {
    inspector = new ServiceLayerInspector();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'service-inspector-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function createFile(relativePath: string, content: string): void {
    const fullPath = path.join(tmpDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }

  describe('when no files match patterns', () => {
    it('should return ABSENT status', async () => {
      const target: InspectionTarget = {
        layer: 'SERVICE',
        patterns: [
          {
            glob: 'apps/api/src/laboratory/patient/**/*.service.ts',
            purpose: 'Patient services',
          },
        ],
        requiredArtifacts: [],
      };

      const result = await inspector.inspect(target, tmpDir);

      expect(result.layer).toBe('SERVICE');
      expect(result.status).toBe('ABSENT');
      expect(result.evidence).toBe(
        'No service files matched inspection patterns',
      );
    });
  });

  describe('when a fully-formed NestJS service is found', () => {
    it('should return PRESENT when @Injectable, DI, and business logic are detected', async () => {
      createFile(
        'apps/api/src/laboratory/patient/patient.service.ts',
        `
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class PatientService {
  constructor(private readonly prisma: PrismaService) {}

  async validatePatientData(data: any) {
    if (!data.name) {
      throw new BadRequestException('Name is required');
    }
    return this.prisma.patient.create({ data });
  }
}
        `.trim(),
      );

      const target: InspectionTarget = {
        layer: 'SERVICE',
        patterns: [
          {
            glob: 'apps/api/src/laboratory/patient/**/*.service.ts',
            purpose: 'Patient services',
          },
        ],
        requiredArtifacts: [],
      };

      const result = await inspector.inspect(target, tmpDir);

      expect(result.layer).toBe('SERVICE');
      expect(result.status).toBe('PRESENT');
      expect(result.evidence).toContain('@Injectable() decorator found');
      expect(result.evidence).toContain('DI constructor injection found');
    });
  });

  describe('when only @Injectable is found without DI or business logic', () => {
    it('should return PARTIAL status', async () => {
      createFile(
        'apps/api/src/laboratory/patient/patient.service.ts',
        `
import { Injectable } from '@nestjs/common';

@Injectable()
export class PatientService {
  getHello(): string {
    return 'hello';
  }
}
        `.trim(),
      );

      const target: InspectionTarget = {
        layer: 'SERVICE',
        patterns: [
          {
            glob: 'apps/api/src/laboratory/patient/**/*.service.ts',
            purpose: 'Patient services',
          },
        ],
        requiredArtifacts: [],
      };

      const result = await inspector.inspect(target, tmpDir);

      expect(result.layer).toBe('SERVICE');
      expect(result.status).toBe('PARTIAL');
      expect(result.evidence).toContain('@Injectable() decorator found');
    });
  });

  describe('when required artifacts are specified', () => {
    it('should return PRESENT when all artifacts and indicators are found', async () => {
      createFile(
        'apps/api/src/laboratory/patient/patient.service.ts',
        `
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class PatientService {
  constructor(private readonly prisma: PrismaService) {}

  async generateMrn() {
    return 'RM-202601-0001';
  }
}
        `.trim(),
      );

      const target: InspectionTarget = {
        layer: 'SERVICE',
        patterns: [
          {
            glob: 'apps/api/src/laboratory/patient/**/*.service.ts',
            purpose: 'Patient services',
          },
        ],
        requiredArtifacts: [
          {
            description: 'MRN generation',
            searchPattern: 'generateMrn|MrnGenerator',
            layer: 'SERVICE',
          },
        ],
      };

      const result = await inspector.inspect(target, tmpDir);

      expect(result.layer).toBe('SERVICE');
      expect(result.status).toBe('PRESENT');
      expect(result.evidence).toContain('1/1 required artifacts matched');
    });

    it('should return PARTIAL when indicators exist but artifacts are missing', async () => {
      createFile(
        'apps/api/src/laboratory/patient/patient.service.ts',
        `
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class PatientService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.patient.findMany();
  }
}
        `.trim(),
      );

      const target: InspectionTarget = {
        layer: 'SERVICE',
        patterns: [
          {
            glob: 'apps/api/src/laboratory/patient/**/*.service.ts',
            purpose: 'Patient services',
          },
        ],
        requiredArtifacts: [
          {
            description: 'MRN generation',
            searchPattern: 'generateMrn|MrnGenerator',
            layer: 'SERVICE',
          },
          {
            description: 'Validation logic',
            searchPattern: 'validatePatient|PatientValidator',
            layer: 'SERVICE',
          },
        ],
      };

      const result = await inspector.inspect(target, tmpDir);

      expect(result.layer).toBe('SERVICE');
      expect(result.status).toBe('PARTIAL');
    });
  });

  describe('business logic detection', () => {
    it('should detect validation patterns (throw new BadRequest)', async () => {
      createFile(
        'apps/api/src/laboratory/order/order.service.ts',
        `
import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class OrderService {
  constructor(private readonly prisma: any) {}

  async createOrder(data: any) {
    throw new BadRequestException('Invalid order');
  }
}
        `.trim(),
      );

      const target: InspectionTarget = {
        layer: 'SERVICE',
        patterns: [
          {
            glob: 'apps/api/src/laboratory/order/**/*.service.ts',
            purpose: 'Order services',
          },
        ],
        requiredArtifacts: [],
      };

      const result = await inspector.inspect(target, tmpDir);

      expect(result.status).toBe('PRESENT');
      expect(result.evidence).toContain('business logic patterns detected');
    });
  });

  describe('error handling', () => {
    it('should handle invalid regex patterns gracefully', async () => {
      createFile(
        'apps/api/src/laboratory/patient/patient.service.ts',
        'export class PatientService {}',
      );

      const target: InspectionTarget = {
        layer: 'SERVICE',
        patterns: [
          {
            glob: 'apps/api/src/laboratory/patient/**/*.service.ts',
            purpose: 'Services',
          },
        ],
        requiredArtifacts: [
          {
            description: 'Bad pattern',
            searchPattern: '[invalid(regex',
            layer: 'SERVICE',
          },
        ],
      };

      const result = await inspector.inspect(target, tmpDir);

      expect(result.issues).toBeDefined();
      expect(result.issues![0]).toContain('Invalid regex');
    });
  });
});

describe('RepositoryLayerInspector', () => {
  let inspector: RepositoryLayerInspector;
  let tmpDir: string;

  beforeEach(() => {
    inspector = new RepositoryLayerInspector();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-inspector-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function createFile(relativePath: string, content: string): void {
    const fullPath = path.join(tmpDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }

  describe('when no files match patterns', () => {
    it('should return ABSENT status', async () => {
      const target: InspectionTarget = {
        layer: 'REPOSITORY',
        patterns: [
          {
            glob: 'apps/api/src/laboratory/patient/**/*.service.ts',
            purpose: 'Patient repo',
          },
        ],
        requiredArtifacts: [],
      };

      const result = await inspector.inspect(target, tmpDir);

      expect(result.layer).toBe('REPOSITORY');
      expect(result.status).toBe('ABSENT');
      expect(result.evidence).toBe(
        'No repository files matched inspection patterns',
      );
    });
  });

  describe('when Prisma usage and query methods are found', () => {
    it('should return PRESENT status', async () => {
      createFile(
        'apps/api/src/laboratory/patient/patient.service.ts',
        `
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class PatientService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.patient.findMany({
      where: { deletedAt: null },
    });
  }

  async findOne(id: string) {
    return this.prisma.patient.findUnique({ where: { id } });
  }

  async create(data: any) {
    return this.prisma.patient.create({ data });
  }
}
        `.trim(),
      );

      const target: InspectionTarget = {
        layer: 'REPOSITORY',
        patterns: [
          {
            glob: 'apps/api/src/laboratory/patient/**/*.service.ts',
            purpose: 'Patient data access',
          },
        ],
        requiredArtifacts: [],
      };

      const result = await inspector.inspect(target, tmpDir);

      expect(result.layer).toBe('REPOSITORY');
      expect(result.status).toBe('PRESENT');
      expect(result.evidence).toContain('Prisma client usage detected');
      expect(result.evidence).toContain('query methods:');
      expect(result.evidence).toContain('findMany');
      expect(result.evidence).toContain('findUnique');
      expect(result.evidence).toContain('create');
    });
  });

  describe('when only Prisma usage but no standard query methods found', () => {
    it('should return PARTIAL status', async () => {
      createFile(
        'apps/api/src/laboratory/patient/patient.service.ts',
        `
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class PatientService {
  constructor(private readonly prisma: PrismaService) {}

  async rawQuery() {
    return this.prisma.$queryRaw\`SELECT 1\`;
  }
}
        `.trim(),
      );

      const target: InspectionTarget = {
        layer: 'REPOSITORY',
        patterns: [
          {
            glob: 'apps/api/src/laboratory/patient/**/*.service.ts',
            purpose: 'Patient data access',
          },
        ],
        requiredArtifacts: [],
      };

      const result = await inspector.inspect(target, tmpDir);

      expect(result.layer).toBe('REPOSITORY');
      expect(result.status).toBe('PARTIAL');
      expect(result.evidence).toContain('Prisma client usage detected');
    });
  });

  describe('transaction detection', () => {
    it('should detect $transaction patterns', async () => {
      createFile(
        'apps/api/src/laboratory/order/order.service.ts',
        `
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  async createWithDetails(data: any) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({ data: data.order });
      await tx.orderDetail.createMany({ data: data.details });
      return order;
    });
  }
}
        `.trim(),
      );

      const target: InspectionTarget = {
        layer: 'REPOSITORY',
        patterns: [
          {
            glob: 'apps/api/src/laboratory/order/**/*.service.ts',
            purpose: 'Order data access',
          },
        ],
        requiredArtifacts: [],
      };

      const result = await inspector.inspect(target, tmpDir);

      expect(result.layer).toBe('REPOSITORY');
      expect(result.status).toBe('PRESENT');
      expect(result.evidence).toContain('$transaction pattern found');
    });
  });

  describe('when required artifacts are specified', () => {
    it('should return PRESENT when Prisma usage AND all artifacts found', async () => {
      createFile(
        'apps/api/src/laboratory/patient/patient.service.ts',
        `
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class PatientService {
  constructor(private readonly prisma: PrismaService) {}

  async findByMrn(mrn: string) {
    return this.prisma.patient.findUnique({ where: { mrn } });
  }
}
        `.trim(),
      );

      const target: InspectionTarget = {
        layer: 'REPOSITORY',
        patterns: [
          {
            glob: 'apps/api/src/laboratory/patient/**/*.service.ts',
            purpose: 'Patient data access',
          },
        ],
        requiredArtifacts: [
          {
            description: 'Patient query',
            searchPattern: 'prisma\\.patient\\.',
            layer: 'REPOSITORY',
          },
        ],
      };

      const result = await inspector.inspect(target, tmpDir);

      expect(result.layer).toBe('REPOSITORY');
      expect(result.status).toBe('PRESENT');
      expect(result.evidence).toContain('1/1 required artifacts matched');
    });

    it('should return PARTIAL when Prisma found but artifacts missing', async () => {
      createFile(
        'apps/api/src/laboratory/patient/patient.service.ts',
        `
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class PatientService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.patient.findMany();
  }
}
        `.trim(),
      );

      const target: InspectionTarget = {
        layer: 'REPOSITORY',
        patterns: [
          {
            glob: 'apps/api/src/laboratory/patient/**/*.service.ts',
            purpose: 'Patient data access',
          },
        ],
        requiredArtifacts: [
          {
            description: 'Patient create',
            searchPattern: 'prisma\\.patient\\.create',
            layer: 'REPOSITORY',
          },
          {
            description: 'Patient update',
            searchPattern: 'prisma\\.patient\\.update',
            layer: 'REPOSITORY',
          },
        ],
      };

      const result = await inspector.inspect(target, tmpDir);

      expect(result.layer).toBe('REPOSITORY');
      expect(result.status).toBe('PARTIAL');
    });
  });

  describe('query method diversity', () => {
    it('should track all detected query methods in evidence', async () => {
      createFile(
        'apps/api/src/laboratory/order/order.service.ts',
        `
import { PrismaService } from '../../common/prisma/prisma.service';

export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  async operations() {
    await this.prisma.order.findMany({});
    await this.prisma.order.findFirst({});
    await this.prisma.order.create({ data: {} });
    await this.prisma.order.update({ where: {}, data: {} });
    await this.prisma.order.delete({ where: {} });
    await this.prisma.order.upsert({ where: {}, create: {}, update: {} });
  }
}
        `.trim(),
      );

      const target: InspectionTarget = {
        layer: 'REPOSITORY',
        patterns: [
          {
            glob: 'apps/api/src/laboratory/order/**/*.service.ts',
            purpose: 'Order repo',
          },
        ],
        requiredArtifacts: [],
      };

      const result = await inspector.inspect(target, tmpDir);

      expect(result.status).toBe('PRESENT');
      expect(result.evidence).toContain('findMany');
      expect(result.evidence).toContain('findFirst');
      expect(result.evidence).toContain('create');
      expect(result.evidence).toContain('update');
      expect(result.evidence).toContain('delete');
      expect(result.evidence).toContain('upsert');
    });
  });

  describe('error handling', () => {
    it('should handle invalid regex patterns gracefully', async () => {
      createFile(
        'apps/api/src/laboratory/patient/patient.service.ts',
        'export class PatientService {}',
      );

      const target: InspectionTarget = {
        layer: 'REPOSITORY',
        patterns: [
          {
            glob: 'apps/api/src/laboratory/patient/**/*.service.ts',
            purpose: 'Services',
          },
        ],
        requiredArtifacts: [
          {
            description: 'Bad pattern',
            searchPattern: '[invalid(regex',
            layer: 'REPOSITORY',
          },
        ],
      };

      const result = await inspector.inspect(target, tmpDir);

      expect(result.issues).toBeDefined();
      expect(result.issues![0]).toContain('Invalid regex');
    });
  });
});
