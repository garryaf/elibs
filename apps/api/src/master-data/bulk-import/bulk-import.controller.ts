import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { Role } from '@prisma/client';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { BulkImportService, ImportEntityType } from './bulk-import.service';
import { BulkExportService, ExportEntityType } from './bulk-export.service';

const VALID_IMPORT_ENTITY_TYPES: ImportEntityType[] = [
  'tests',
  'tariffs',
  'doctors',
  'clinics',
];

const VALID_EXPORT_ENTITY_TYPES: ExportEntityType[] = [
  'tests',
  'tariffs',
  'doctors',
  'clinics',
  'panels',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@Controller('api/v1/master')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class BulkImportController {
  constructor(
    private readonly bulkImportService: BulkImportService,
    private readonly bulkExportService: BulkExportService,
  ) {}

  @Post('import/:entityType')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        const allowedMimes = [
          'text/csv',
          'application/csv',
          'text/plain',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `Unsupported file type: ${file.mimetype}. Use CSV or Excel (xlsx) format.`,
            ),
            false,
          );
        }
      },
    }),
  )
  async importData(
    @Param('entityType') entityType: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded. Please attach a CSV or Excel file.');
    }

    if (!VALID_IMPORT_ENTITY_TYPES.includes(entityType as ImportEntityType)) {
      throw new BadRequestException(
        `Invalid entity type '${entityType}'. Valid types: ${VALID_IMPORT_ENTITY_TYPES.join(', ')}`,
      );
    }

    return this.bulkImportService.import(
      entityType as ImportEntityType,
      file.buffer,
      file.mimetype,
    );
  }

  @Get('export/:entityType')
  async exportData(
    @Param('entityType') entityType: string,
    @Query('format') format: string = 'csv',
    @Res() res: Response,
  ) {
    if (!VALID_EXPORT_ENTITY_TYPES.includes(entityType as ExportEntityType)) {
      throw new BadRequestException(
        `Invalid entity type '${entityType}'. Valid types: ${VALID_EXPORT_ENTITY_TYPES.join(', ')}`,
      );
    }

    if (format !== 'csv') {
      throw new BadRequestException(
        `Unsupported export format '${format}'. Currently only 'csv' is supported.`,
      );
    }

    const csvBuffer = await this.bulkExportService.exportCsv(
      entityType as ExportEntityType,
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${entityType}-export-${Date.now()}.csv"`,
    );
    res.send(csvBuffer);
  }
}
