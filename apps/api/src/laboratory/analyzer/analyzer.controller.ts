import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { AnalyzerService } from './analyzer.service';
import { SingleResultDto } from './dto/single-result.dto';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * AnalyzerController provides HTTP endpoints for laboratory analyzer result import.
 *
 * Endpoints:
 * - POST /api/v1/analyzer/import — Batch CSV result import (multipart/form-data)
 * - GET /api/v1/analyzer/import-history — List previous imports with stats
 * - POST /api/v1/analyzer/single-result — Single result entry from analyzer
 *
 * Requirements: 2.1, 2.2
 */
@ApiTags('Analyzer')
@ApiBearerAuth()
@Controller('api/v1/analyzer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ANALIS, Role.ADMIN, Role.SUPER_ADMIN)
export class AnalyzerController {
  private readonly logger = new Logger(AnalyzerController.name);

  constructor(
    private readonly analyzerService: AnalyzerService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Batch CSV result import (multipart/form-data).
   * Accepts a CSV file with columns: orderNumber, testCode, resultValue, analyzedAt?, analyzerCode?
   * Validates each row against test configuration, applies auto-flagging, and persists within a transaction.
   */
  @Post('import')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Batch import analyzer results from CSV file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        const allowedMimes = [
          'text/csv',
          'application/csv',
          'text/plain',
          'application/vnd.ms-excel',
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `Tipe file tidak didukung: ${file.mimetype}. Gunakan format CSV.`,
            ),
            false,
          );
        }
      },
    }),
  )
  async importBatchResults(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    if (!file) {
      throw new BadRequestException(
        'File tidak ditemukan. Silakan lampirkan file CSV.',
      );
    }

    const result = await this.analyzerService.importBatchResults(file, user.id);

    // Log the import action to audit trail
    await this.auditService.log(
      user.id,
      'BATCH_IMPORT',
      'OrderDetail',
      user.id, // Use userId as entityId for batch-level tracking
      null,
      {
        fileName: file.originalname,
        totalRows: result.totalRows,
        successCount: result.successCount,
        errorCount: result.errorCount,
      },
    );

    this.logger.log(
      `Batch import by user ${user.id}: ${result.successCount}/${result.totalRows} rows`,
    );

    return result;
  }

  /**
   * List previous batch imports with summary statistics.
   * Queries audit logs for BATCH_IMPORT actions on OrderDetail entity.
   */
  @Get('import-history')
  @ApiOperation({ summary: 'List previous batch imports with stats' })
  async getImportHistory(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.analyzerService.getImportHistory({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /**
   * Single result entry from an analyzer.
   * Validates the result against test configuration, applies auto-flagging, and persists.
   */
  @Post('single-result')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enter a single result from an analyzer' })
  async enterSingleResult(
    @Body() dto: SingleResultDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    const result = await this.analyzerService.enterSingleResult(dto, user.id);

    // Log the single result entry
    await this.auditService.log(
      user.id,
      'SINGLE_RESULT_ENTRY',
      'OrderDetail',
      result.orderDetailId,
      null,
      {
        orderNumber: dto.orderNumber,
        testCode: dto.testCode,
        resultValue: dto.resultValue,
        flag: result.flag,
      },
    );

    return result;
  }
}
