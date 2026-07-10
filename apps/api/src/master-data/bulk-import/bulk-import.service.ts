import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { parse } from 'csv-parse';
import { Readable } from 'stream';
import * as ExcelJS from 'exceljs';

export interface BulkImportError {
  row: number;
  field: string;
  value: string;
  message: string;
}

export interface BulkImportResult {
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: BulkImportError[];
}

export type ImportEntityType = 'tests' | 'tariffs' | 'doctors' | 'clinics';

interface EntitySchema {
  requiredFields: string[];
  fieldTypes: Record<string, 'string' | 'number' | 'boolean' | 'uuid' | 'date'>;
  uniqueKey: string;
}

const ENTITY_SCHEMAS: Record<ImportEntityType, EntitySchema> = {
  tests: {
    requiredFields: ['code', 'name', 'categoryId', 'price'],
    fieldTypes: {
      code: 'string',
      name: 'string',
      categoryId: 'uuid',
      unit: 'string',
      method: 'string',
      sampleType: 'string',
      price: 'number',
      requiresDoctorApproval: 'boolean',
      isActive: 'boolean',
    },
    uniqueKey: 'code',
  },
  tariffs: {
    requiredFields: ['testId', 'price', 'effectiveFrom'],
    fieldTypes: {
      testId: 'uuid',
      clinicId: 'uuid',
      insuranceId: 'uuid',
      price: 'number',
      discount: 'number',
      effectiveFrom: 'date',
      effectiveTo: 'date',
    },
    uniqueKey: 'testId',
  },
  doctors: {
    requiredFields: ['code', 'name'],
    fieldTypes: {
      code: 'string',
      name: 'string',
      specialization: 'string',
      phone: 'string',
      email: 'string',
      licenseNumber: 'string',
      isActive: 'boolean',
    },
    uniqueKey: 'code',
  },
  clinics: {
    requiredFields: ['code', 'name'],
    fieldTypes: {
      code: 'string',
      name: 'string',
      address: 'string',
      phone: 'string',
      email: 'string',
      isActive: 'boolean',
    },
    uniqueKey: 'code',
  },
};

@Injectable()
export class BulkImportService {
  private readonly logger = new Logger(BulkImportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async import(
    entityType: ImportEntityType,
    fileBuffer: Buffer,
    mimeType: string,
  ): Promise<BulkImportResult> {
    const rows = await this.parseFile(fileBuffer, mimeType);

    if (rows.length === 0) {
      throw new BadRequestException('File contains no data rows');
    }

    if (rows.length > 10000) {
      throw new BadRequestException(
        'File exceeds maximum of 10,000 rows. Please split into smaller files.',
      );
    }

    const schema = ENTITY_SCHEMAS[entityType];
    const errors: BulkImportError[] = [];
    let successCount = 0;

    // Process rows in batches to avoid memory issues
    const BATCH_SIZE = 100;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);

      for (let j = 0; j < batch.length; j++) {
        const rowIndex = i + j + 2; // +2 for 1-based index + header row
        const row = batch[j];

        const rowErrors = this.validateRow(row, schema, rowIndex);
        if (rowErrors.length > 0) {
          errors.push(...rowErrors);
          continue;
        }

        try {
          await this.upsertRow(entityType, row, schema);
          successCount++;
        } catch (error) {
          errors.push({
            row: rowIndex,
            field: '_general',
            value: '',
            message:
              error instanceof Error
                ? error.message
                : 'Unknown database error',
          });
        }
      }
    }

    return {
      totalRows: rows.length,
      successCount,
      errorCount: errors.length,
      errors,
    };
  }

  private async parseFile(
    fileBuffer: Buffer,
    mimeType: string,
  ): Promise<Record<string, string>[]> {
    if (
      mimeType === 'text/csv' ||
      mimeType === 'application/csv' ||
      mimeType === 'text/plain'
    ) {
      return this.parseCsv(fileBuffer);
    }

    if (
      mimeType ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimeType === 'application/vnd.ms-excel'
    ) {
      return this.parseExcel(fileBuffer);
    }

    throw new BadRequestException(
      `Unsupported file type: ${mimeType}. Use CSV or Excel (xlsx) format.`,
    );
  }

  private parseCsv(fileBuffer: Buffer): Promise<Record<string, string>[]> {
    return new Promise((resolve, reject) => {
      const rows: Record<string, string>[] = [];
      const stream = Readable.from(fileBuffer);

      stream
        .pipe(
          parse({
            columns: true,
            skip_empty_lines: true,
            trim: true,
            relax_column_count: true,
          }),
        )
        .on('data', (row: Record<string, string>) => {
          rows.push(row);
        })
        .on('end', () => resolve(rows))
        .on('error', (err) =>
          reject(
            new BadRequestException(`CSV parse error: ${err.message}`),
          ),
        );
    });
  }

  private async parseExcel(
    fileBuffer: Buffer,
  ): Promise<Record<string, string>[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as any);

    const worksheet = workbook.worksheets[0];
    if (!worksheet || worksheet.rowCount < 2) {
      return [];
    }

    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber - 1] = String(cell.value || '').trim();
    });

    const rows: Record<string, string>[] = [];
    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      const record: Record<string, string> = {};
      let hasData = false;

      headers.forEach((header, idx) => {
        const cell = row.getCell(idx + 1);
        const value = cell.value;
        if (value !== null && value !== undefined && value !== '') {
          record[header] = String(value).trim();
          hasData = true;
        } else {
          record[header] = '';
        }
      });

      if (hasData) {
        rows.push(record);
      }
    }

    return rows;
  }

  private validateRow(
    row: Record<string, string>,
    schema: EntitySchema,
    rowIndex: number,
  ): BulkImportError[] {
    const errors: BulkImportError[] = [];

    // Check required fields
    for (const field of schema.requiredFields) {
      if (!row[field] || row[field].trim() === '') {
        errors.push({
          row: rowIndex,
          field,
          value: row[field] || '',
          message: `Field '${field}' is required`,
        });
      }
    }

    // Check field types
    for (const [field, type] of Object.entries(schema.fieldTypes)) {
      const value = row[field];
      if (!value || value.trim() === '') continue;

      switch (type) {
        case 'number': {
          const num = Number(value);
          if (isNaN(num)) {
            errors.push({
              row: rowIndex,
              field,
              value,
              message: `Field '${field}' must be a valid number`,
            });
          }
          break;
        }
        case 'boolean': {
          const lower = value.toLowerCase();
          if (!['true', 'false', '1', '0', 'yes', 'no'].includes(lower)) {
            errors.push({
              row: rowIndex,
              field,
              value,
              message: `Field '${field}' must be a boolean (true/false, 1/0, yes/no)`,
            });
          }
          break;
        }
        case 'uuid': {
          const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(value)) {
            errors.push({
              row: rowIndex,
              field,
              value,
              message: `Field '${field}' must be a valid UUID`,
            });
          }
          break;
        }
        case 'date': {
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            errors.push({
              row: rowIndex,
              field,
              value,
              message: `Field '${field}' must be a valid date`,
            });
          }
          break;
        }
      }
    }

    return errors;
  }

  private parseBoolean(value: string): boolean {
    const lower = value.toLowerCase();
    return ['true', '1', 'yes'].includes(lower);
  }

  private async upsertRow(
    entityType: ImportEntityType,
    row: Record<string, string>,
    schema: EntitySchema,
  ): Promise<void> {
    switch (entityType) {
      case 'tests':
        await this.upsertTest(row);
        break;
      case 'tariffs':
        await this.upsertTariff(row);
        break;
      case 'doctors':
        await this.upsertDoctor(row);
        break;
      case 'clinics':
        await this.upsertClinic(row);
        break;
    }
  }

  private async upsertTest(row: Record<string, string>): Promise<void> {
    const data: any = {
      name: row.name,
      categoryId: row.categoryId,
      price: Number(row.price),
    };

    if (row.unit) data.unit = row.unit;
    if (row.method) data.method = row.method;
    if (row.sampleType) data.sampleType = row.sampleType;
    if (row.requiresDoctorApproval)
      data.requiresDoctorApproval = this.parseBoolean(
        row.requiresDoctorApproval,
      );
    if (row.isActive) data.isActive = this.parseBoolean(row.isActive);

    const existing = await this.prisma.testMaster.findFirst({
      where: { code: row.code, deletedAt: null },
    });

    if (existing) {
      await this.prisma.testMaster.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await this.prisma.testMaster.create({
        data: { code: row.code, ...data },
      });
    }
  }

  private async upsertTariff(row: Record<string, string>): Promise<void> {
    const effectiveFrom = new Date(row.effectiveFrom);
    const data: any = {
      testId: row.testId,
      price: Number(row.price),
      effectiveFrom,
      clinicId: row.clinicId || null,
      insuranceId: row.insuranceId || null,
    };

    if (row.discount) data.discount = Number(row.discount);
    if (row.effectiveTo) data.effectiveTo = new Date(row.effectiveTo);

    const existing = await this.prisma.tariff.findFirst({
      where: {
        testId: row.testId,
        clinicId: row.clinicId || null,
        insuranceId: row.insuranceId || null,
        effectiveFrom,
      },
    });

    if (existing) {
      await this.prisma.tariff.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await this.prisma.tariff.create({ data });
    }
  }

  private async upsertDoctor(row: Record<string, string>): Promise<void> {
    const data: any = {
      name: row.name,
    };

    if (row.specialization) data.specialization = row.specialization;
    if (row.phone) data.phone = row.phone;
    if (row.email) data.email = row.email;
    if (row.licenseNumber) data.licenseNumber = row.licenseNumber;
    if (row.isActive) data.isActive = this.parseBoolean(row.isActive);

    const existing = await this.prisma.doctor.findFirst({
      where: { code: row.code, deletedAt: null },
    });

    if (existing) {
      await this.prisma.doctor.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await this.prisma.doctor.create({
        data: { code: row.code, ...data },
      });
    }
  }

  private async upsertClinic(row: Record<string, string>): Promise<void> {
    const data: any = {
      name: row.name,
    };

    if (row.address) data.address = row.address;
    if (row.phone) data.phone = row.phone;
    if (row.email) data.email = row.email;
    if (row.isActive) data.isActive = this.parseBoolean(row.isActive);

    const existing = await this.prisma.clinic.findFirst({
      where: { code: row.code, deletedAt: null },
    });

    if (existing) {
      await this.prisma.clinic.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await this.prisma.clinic.create({
        data: { code: row.code, ...data },
      });
    }
  }
}
