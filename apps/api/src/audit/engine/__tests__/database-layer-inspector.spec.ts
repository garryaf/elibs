import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { DatabaseLayerInspector } from '../inspectors/database-layer.inspector';
import { InspectionTarget } from '../interfaces';

describe('DatabaseLayerInspector', () => {
  let inspector: DatabaseLayerInspector;
  let tmpDir: string;

  beforeEach(() => {
    inspector = new DatabaseLayerInspector();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'db-inspector-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function createSchemaFile(content: string): void {
    const schemaDir = path.join(tmpDir, 'apps/api/prisma');
    fs.mkdirSync(schemaDir, { recursive: true });
    fs.writeFileSync(path.join(schemaDir, 'schema.prisma'), content);
  }

  const SAMPLE_SCHEMA = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Gender {
  MALE
  FEMALE
}

enum OrderStatus {
  PENDING_PAYMENT
  PAID
  SAMPLE_COLLECTED
  IN_ANALYSIS
  VERIFIED
  APPROVED
  CANCELLED
}

model Patient {
  id          String   @id @default(uuid()) @db.Uuid
  mrn         String   @unique
  nik         String   @unique
  name        String
  dateOfBirth DateTime @db.Date
  gender      Gender
  phone       String?
  address     String?
  email       String?
  insuranceId String?  @db.Uuid
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  orders Order[]
  patientInsurances PatientInsurance[]

  @@index([phone])
  @@map("patients")
}

model Visit {
  id               String      @id @default(uuid()) @db.Uuid
  visitNumber      String      @unique @db.VarChar(50)
  status           String      @default("REGISTERED")
  patientId        String      @db.Uuid
  doctorId         String?     @db.Uuid
  clinicId         String?     @db.Uuid
  paymentMethod    String
  insuranceId      String?     @db.Uuid
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt

  patient Patient @relation(fields: [patientId], references: [id])
  orders  Order[]

  @@index([status])
  @@index([patientId])
  @@map("visits")
}

model Order {
  id            String   @id @default(uuid()) @db.Uuid
  orderNumber   String   @unique
  patientId     String   @db.Uuid
  visitId       String   @db.Uuid
  status        OrderStatus @default(PENDING_PAYMENT)
  totalAmount   Decimal  @db.Decimal(12, 2)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  patient      Patient       @relation(fields: [patientId], references: [id])
  visit        Visit         @relation(fields: [visitId], references: [id])
  orderDetails OrderDetail[]

  @@index([status])
  @@index([patientId])
  @@map("orders")
}

model OrderDetail {
  id          String  @id @default(uuid()) @db.Uuid
  orderId     String  @db.Uuid
  testId      String  @db.Uuid
  resultValue String?
  price       Decimal @db.Decimal(12, 2)
  discount    Decimal @default(0) @db.Decimal(5, 2)
  finalPrice  Decimal @db.Decimal(12, 2)

  order Order @relation(fields: [orderId], references: [id])

  @@index([orderId])
  @@map("order_details")
}

model PatientInsurance {
  id          String @id @default(uuid()) @db.Uuid
  patientId   String @db.Uuid
  insuranceId String @db.Uuid
  priority    Int    @default(1)

  patient Patient @relation(fields: [patientId], references: [id])

  @@unique([patientId, insuranceId])
  @@unique([patientId, priority])
  @@map("patient_insurances")
}

model Tariff {
  id            String    @id @default(uuid()) @db.Uuid
  testId        String    @db.Uuid
  clinicId      String?   @db.Uuid
  insuranceId   String?   @db.Uuid
  price         Decimal   @db.Decimal(12, 2)
  discount      Decimal   @default(0) @db.Decimal(5, 2)
  effectiveFrom DateTime  @default(now())
  effectiveTo   DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@unique([testId, clinicId, insuranceId, effectiveFrom])
  @@map("tariffs")
}
`.trim();

  describe('when schema file does not exist', () => {
    it('should return ABSENT status', async () => {
      const target: InspectionTarget = {
        layer: 'DATABASE',
        patterns: [
          { glob: 'apps/api/prisma/schema.prisma', purpose: 'Prisma schema' },
        ],
        requiredArtifacts: [],
      };

      const result = await inspector.inspect(target, tmpDir);

      expect(result.layer).toBe('DATABASE');
      expect(result.status).toBe('ABSENT');
      expect(result.evidence).toContain('not found');
    });
  });

  describe('when schema exists with no required artifacts', () => {
    it('should return PRESENT status with model/enum counts', async () => {
      createSchemaFile(SAMPLE_SCHEMA);

      const target: InspectionTarget = {
        layer: 'DATABASE',
        patterns: [
          { glob: 'apps/api/prisma/schema.prisma', purpose: 'Prisma schema' },
        ],
        requiredArtifacts: [],
      };

      const result = await inspector.inspect(target, tmpDir);

      expect(result.layer).toBe('DATABASE');
      expect(result.status).toBe('PRESENT');
      expect(result.filePath).toContain('schema.prisma');
      expect(result.evidence).toContain('models');
      expect(result.evidence).toContain('enums');
    });
  });

  describe('when all required artifacts are found', () => {
    it('should return PRESENT status for Patient model check', async () => {
      createSchemaFile(SAMPLE_SCHEMA);

      const target: InspectionTarget = {
        layer: 'DATABASE',
        patterns: [
          { glob: 'apps/api/prisma/schema.prisma', purpose: 'Prisma schema' },
        ],
        requiredArtifacts: [
          {
            description: 'Patient model exists',
            searchPattern: 'model Patient',
            layer: 'DATABASE',
          },
          {
            description: 'Patient has mrn field',
            searchPattern: 'mrn\\s+String\\s+@unique',
            layer: 'DATABASE',
          },
          {
            description: 'Patient has nik field',
            searchPattern: 'nik\\s+String\\s+@unique',
            layer: 'DATABASE',
          },
        ],
      };

      const result = await inspector.inspect(target, tmpDir);

      expect(result.layer).toBe('DATABASE');
      expect(result.status).toBe('PRESENT');
      expect(result.evidence).toContain('3/3');
    });
  });

  describe('when some required artifacts are found', () => {
    it('should return PARTIAL status', async () => {
      createSchemaFile(SAMPLE_SCHEMA);

      const target: InspectionTarget = {
        layer: 'DATABASE',
        patterns: [
          { glob: 'apps/api/prisma/schema.prisma', purpose: 'Prisma schema' },
        ],
        requiredArtifacts: [
          {
            description: 'Patient model exists',
            searchPattern: 'model Patient',
            layer: 'DATABASE',
          },
          {
            description: 'Patient has bloodType',
            searchPattern: 'bloodType\\s+String',
            layer: 'DATABASE',
          },
          {
            description: 'NonExistentModel',
            searchPattern: 'model NonExistent',
            layer: 'DATABASE',
          },
        ],
      };

      const result = await inspector.inspect(target, tmpDir);

      expect(result.layer).toBe('DATABASE');
      expect(result.status).toBe('PARTIAL');
      expect(result.evidence).toContain('1/3');
    });
  });

  describe('when no required artifacts are found', () => {
    it('should return ABSENT status', async () => {
      createSchemaFile(SAMPLE_SCHEMA);

      const target: InspectionTarget = {
        layer: 'DATABASE',
        patterns: [
          { glob: 'apps/api/prisma/schema.prisma', purpose: 'Prisma schema' },
        ],
        requiredArtifacts: [
          {
            description: 'Missing model',
            searchPattern: 'model Specimen',
            layer: 'DATABASE',
          },
          {
            description: 'Missing table',
            searchPattern: '@@map\\("specimens"\\)',
            layer: 'DATABASE',
          },
        ],
      };

      const result = await inspector.inspect(target, tmpDir);

      expect(result.layer).toBe('DATABASE');
      expect(result.status).toBe('ABSENT');
      expect(result.evidence).toContain('0/2');
    });
  });

  describe('relation detection', () => {
    it('should find @relation patterns in schema', async () => {
      createSchemaFile(SAMPLE_SCHEMA);

      const target: InspectionTarget = {
        layer: 'DATABASE',
        patterns: [
          { glob: 'apps/api/prisma/schema.prisma', purpose: 'Prisma schema' },
        ],
        requiredArtifacts: [
          {
            description: 'Order-Patient relation',
            searchPattern: 'patient\\s+Patient\\s+@relation',
            layer: 'DATABASE',
          },
          {
            description: 'Order-Visit relation',
            searchPattern: 'visit\\s+Visit\\s+@relation',
            layer: 'DATABASE',
          },
        ],
      };

      const result = await inspector.inspect(target, tmpDir);

      expect(result.status).toBe('PRESENT');
    });
  });

  describe('constraint detection', () => {
    it('should find @@unique constraints', async () => {
      createSchemaFile(SAMPLE_SCHEMA);

      const target: InspectionTarget = {
        layer: 'DATABASE',
        patterns: [
          { glob: 'apps/api/prisma/schema.prisma', purpose: 'Prisma schema' },
        ],
        requiredArtifacts: [
          {
            description: 'PatientInsurance unique constraint',
            searchPattern: '@@unique\\(\\[patientId, priority\\]\\)',
            layer: 'DATABASE',
          },
          {
            description: 'Tariff unique constraint',
            searchPattern:
              '@@unique\\(\\[testId, clinicId, insuranceId, effectiveFrom\\]\\)',
            layer: 'DATABASE',
          },
        ],
      };

      const result = await inspector.inspect(target, tmpDir);

      expect(result.status).toBe('PRESENT');
    });
  });

  describe('enum detection', () => {
    it('should find enum definitions', async () => {
      createSchemaFile(SAMPLE_SCHEMA);

      const target: InspectionTarget = {
        layer: 'DATABASE',
        patterns: [
          { glob: 'apps/api/prisma/schema.prisma', purpose: 'Prisma schema' },
        ],
        requiredArtifacts: [
          {
            description: 'Gender enum',
            searchPattern: 'enum Gender',
            layer: 'DATABASE',
          },
          {
            description: 'OrderStatus enum',
            searchPattern: 'enum OrderStatus',
            layer: 'DATABASE',
          },
        ],
      };

      const result = await inspector.inspect(target, tmpDir);

      expect(result.status).toBe('PRESENT');
    });
  });

  describe('FK detection via visitId', () => {
    it('should detect FK fields referenced in Order model', async () => {
      createSchemaFile(SAMPLE_SCHEMA);

      const target: InspectionTarget = {
        layer: 'DATABASE',
        patterns: [
          { glob: 'apps/api/prisma/schema.prisma', purpose: 'Prisma schema' },
        ],
        requiredArtifacts: [
          {
            description: 'Order has visitId FK',
            searchPattern: 'visitId\\s+String\\s+@db\\.Uuid',
            layer: 'DATABASE',
          },
          {
            description: 'Order has patientId FK',
            searchPattern: 'patientId\\s+String\\s+@db\\.Uuid',
            layer: 'DATABASE',
          },
        ],
      };

      const result = await inspector.inspect(target, tmpDir);

      expect(result.status).toBe('PRESENT');
    });
  });

  describe('schema parsing', () => {
    it('should parse models correctly', () => {
      const schema = inspector.parseSchema(SAMPLE_SCHEMA);

      expect(schema.models.length).toBeGreaterThanOrEqual(5);
      const patientModel = schema.models.find((m) => m.name === 'Patient');
      expect(patientModel).toBeDefined();
      expect(patientModel!.fields.find((f) => f.name === 'mrn')).toBeDefined();
      expect(
        patientModel!.fields.find((f) => f.name === 'mrn')!.hasUnique,
      ).toBe(true);
      expect(patientModel!.tableName).toBe('patients');
    });

    it('should parse enums correctly', () => {
      const schema = inspector.parseSchema(SAMPLE_SCHEMA);

      expect(schema.enums.length).toBe(2);
      const genderEnum = schema.enums.find((e) => e.name === 'Gender');
      expect(genderEnum).toBeDefined();
      expect(genderEnum!.values).toContain('MALE');
      expect(genderEnum!.values).toContain('FEMALE');
    });

    it('should parse unique constraints', () => {
      const schema = inspector.parseSchema(SAMPLE_SCHEMA);

      const piModel = schema.models.find((m) => m.name === 'PatientInsurance');
      expect(piModel).toBeDefined();
      expect(piModel!.uniqueConstraints.length).toBe(2);
      expect(piModel!.uniqueConstraints).toContainEqual([
        'patientId',
        'insuranceId',
      ]);
      expect(piModel!.uniqueConstraints).toContainEqual([
        'patientId',
        'priority',
      ]);
    });

    it('should parse indexes', () => {
      const schema = inspector.parseSchema(SAMPLE_SCHEMA);

      const orderModel = schema.models.find((m) => m.name === 'Order');
      expect(orderModel).toBeDefined();
      expect(orderModel!.indexes.length).toBe(2);
      expect(orderModel!.indexes).toContainEqual(['status']);
      expect(orderModel!.indexes).toContainEqual(['patientId']);
    });

    it('should detect relation fields', () => {
      const schema = inspector.parseSchema(SAMPLE_SCHEMA);

      const orderModel = schema.models.find((m) => m.name === 'Order');
      expect(orderModel).toBeDefined();
      const patientField = orderModel!.fields.find((f) => f.name === 'patient');
      expect(patientField).toBeDefined();
      expect(patientField!.isRelation).toBe(true);
      expect(patientField!.relationTarget).toBe('Patient');
    });

    it('should detect optional fields', () => {
      const schema = inspector.parseSchema(SAMPLE_SCHEMA);

      const patientModel = schema.models.find((m) => m.name === 'Patient');
      expect(patientModel).toBeDefined();
      const phoneField = patientModel!.fields.find((f) => f.name === 'phone');
      expect(phoneField).toBeDefined();
      expect(phoneField!.isOptional).toBe(true);

      const nameField = patientModel!.fields.find((f) => f.name === 'name');
      expect(nameField).toBeDefined();
      expect(nameField!.isOptional).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle invalid regex patterns gracefully', async () => {
      createSchemaFile(SAMPLE_SCHEMA);

      const target: InspectionTarget = {
        layer: 'DATABASE',
        patterns: [
          { glob: 'apps/api/prisma/schema.prisma', purpose: 'Prisma schema' },
        ],
        requiredArtifacts: [
          {
            description: 'Bad pattern',
            searchPattern: '[invalid(regex',
            layer: 'DATABASE',
          },
        ],
      };

      const result = await inspector.inspect(target, tmpDir);

      expect(result.issues).toBeDefined();
      expect(result.issues![0]).toContain('Invalid regex');
    });

    it('should return ABSENT when schema file is unreadable', async () => {
      const schemaDir = path.join(tmpDir, 'apps/api/prisma');
      fs.mkdirSync(schemaDir, { recursive: true });
      const schemaPath = path.join(schemaDir, 'schema.prisma');
      fs.writeFileSync(schemaPath, 'content');
      fs.chmodSync(schemaPath, 0o000);

      const target: InspectionTarget = {
        layer: 'DATABASE',
        patterns: [
          { glob: 'apps/api/prisma/schema.prisma', purpose: 'Prisma schema' },
        ],
        requiredArtifacts: [],
      };

      const result = await inspector.inspect(target, tmpDir);

      // Restore permissions for cleanup
      fs.chmodSync(schemaPath, 0o644);

      expect(result.status).toBe('ABSENT');
      expect(result.evidence).toContain('Failed to read');
    });
  });

  describe('custom schema path resolution', () => {
    it('should resolve schema path from target patterns', async () => {
      const customDir = path.join(tmpDir, 'custom/path');
      fs.mkdirSync(customDir, { recursive: true });
      fs.writeFileSync(
        path.join(customDir, 'schema.prisma'),
        'model Test { id String @id }',
      );

      const target: InspectionTarget = {
        layer: 'DATABASE',
        patterns: [
          {
            glob: 'custom/path/schema.prisma',
            purpose: 'Custom Prisma schema location',
          },
        ],
        requiredArtifacts: [
          {
            description: 'Test model',
            searchPattern: 'model Test',
            layer: 'DATABASE',
          },
        ],
      };

      const result = await inspector.inspect(target, tmpDir);

      expect(result.status).toBe('PRESENT');
    });

    it('should default to apps/api/prisma/schema.prisma when no schema pattern found', async () => {
      createSchemaFile(SAMPLE_SCHEMA);

      const target: InspectionTarget = {
        layer: 'DATABASE',
        patterns: [{ glob: 'some/other/path/**/*.ts', purpose: 'Some files' }],
        requiredArtifacts: [
          {
            description: 'Patient model',
            searchPattern: 'model Patient',
            layer: 'DATABASE',
          },
        ],
      };

      const result = await inspector.inspect(target, tmpDir);

      expect(result.status).toBe('PRESENT');
    });
  });

  describe('line references', () => {
    it('should provide line numbers for found artifacts', async () => {
      createSchemaFile(SAMPLE_SCHEMA);

      const target: InspectionTarget = {
        layer: 'DATABASE',
        patterns: [
          { glob: 'apps/api/prisma/schema.prisma', purpose: 'Prisma schema' },
        ],
        requiredArtifacts: [
          {
            description: 'Patient model',
            searchPattern: 'model Patient',
            layer: 'DATABASE',
          },
        ],
      };

      const result = await inspector.inspect(target, tmpDir);

      expect(result.lineReferences).toBeDefined();
      expect(result.lineReferences!.length).toBe(1);
      expect(result.lineReferences![0]).toBeGreaterThan(0);
    });
  });
});
