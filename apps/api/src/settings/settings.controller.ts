import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsNotEmpty,
  IsEnum,
  IsIn,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import * as fs from 'fs';
import * as path from 'path';
import * as express from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SettingsService } from './settings.service';
import { EmailService } from '../laboratory/notification/email.service';
import { AuditService } from '../laboratory/audit/audit.service';

// ─── SMTP Settings DTO ────────────────────────────────────────────────────────

export class SmtpSettingsDto {
  @IsString()
  @MaxLength(255)
  host: string;

  @IsNumber()
  @Min(1)
  @Max(65535)
  port: number;

  @IsBoolean()
  secure: boolean;

  @IsString()
  @MaxLength(255)
  user: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  pass?: string;

  @IsString()
  @MaxLength(255)
  senderName: string;

  @IsEmail()
  @MaxLength(255)
  senderEmail: string;
}

// ─── General Settings DTO ─────────────────────────────────────────────────────

export enum FacilityType {
  HOSPITAL = 'HOSPITAL',
  CLINIC = 'CLINIC',
  STANDALONE_LAB = 'STANDALONE_LAB',
}

export class GeneralSettingsDto {
  // === Identitas Fasilitas (BIZ-GEN-01) ===
  @IsString()
  @IsNotEmpty({ message: 'Nama fasilitas wajib diisi' })
  @MaxLength(255)
  facilityName: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  facilityCode?: string;

  @IsOptional()
  @IsEnum(FacilityType)
  facilityType?: FacilityType;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  province?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  postalCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  fax?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  npwp?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  licenseNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  accreditation?: string;

  // === Regional (BIZ-GEN-03) ===
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @IsOptional()
  @IsIn(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD-MM-YYYY'])
  dateFormat?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @IsOptional()
  @IsIn(['id-ID', 'en-US'])
  locale?: string;

  @IsOptional()
  @IsIn(['1.000,50', '1,000.50'])
  numberFormat?: string;

  // === Penomoran (BIZ-GEN-04) ===
  @IsOptional()
  @IsString()
  @MaxLength(100)
  orderNumberFormat?: string;

  @IsOptional()
  @IsIn(['DAILY', 'MONTHLY', 'YEARLY', 'NEVER'])
  orderNumberReset?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  visitNumberFormat?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  invoiceNumberFormat?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  mrnFormat?: string;

  // === Operasional (BIZ-GEN-05) ===
  @IsOptional()
  @IsString()
  @MaxLength(5)
  operatingHoursStart?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  operatingHoursEnd?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  operatingDays?: string;

  @IsOptional()
  @IsBoolean()
  is24h?: boolean;

  // === Session & Security (BIZ-GEN-06) ===
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(1440)
  sessionTimeoutMinutes?: number;

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(1440)
  autoLogoutIdleMinutes?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  maxLoginAttempts?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1440)
  lockoutDurationMinutes?: number;

  @IsOptional()
  @IsNumber()
  @Min(6)
  @Max(128)
  passwordMinLength?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(365)
  requirePasswordChangeDays?: number;

  // === Maintenance & Backup (BIZ-GEN-07) ===
  @IsOptional()
  @IsBoolean()
  maintenanceMode?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  maintenanceMessage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  backupScheduleCron?: string;

  // === Pagination & Display (BIZ-GEN-08) ===
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(100)
  defaultPageSize?: number;

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  defaultSortOrder?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  dashboardDataRetentionDays?: number;
}

// ─── Controller ───────────────────────────────────────────────────────────────

// Deterministic UUIDs for audit trail entity IDs (settings have no real UUID PK)
const SETTINGS_AUDIT_ENTITY_ID = '00000000-0000-0000-0000-000000000001';

@ApiTags('Settings')
@ApiBearerAuth()
@Controller('api/v1/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly emailService: EmailService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Extract IP address from request.
   */
  private getIpAddress(req: express.Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      ''
    );
  }

  /**
   * GET /api/v1/settings?prefix=notification.
   * Generic key-value settings retrieval by prefix.
   */
  @Get()
  @ApiOperation({ summary: 'Get settings by prefix' })
  @ApiQuery({
    name: 'prefix',
    required: false,
    description: 'Key prefix filter',
  })
  async getSettings(@Query('prefix') prefix?: string) {
    if (prefix) {
      return this.settingsService.getSettingsByPrefix(prefix);
    }
    // Return all settings if no prefix
    return this.settingsService.getSettingsByPrefix('');
  }

  /**
   * PUT /api/v1/settings/bulk
   * Bulk upsert settings with key whitelist validation (BACK-GEN-01).
   */
  @Put('bulk')
  @ApiOperation({ summary: 'Bulk update settings' })
  async bulkUpdateSettings(
    @Body() body: { entries: { key: string; value: string }[] },
    @CurrentUser() user: { sub: string; role: string },
    @Req() req: express.Request,
  ) {
    const entries = body.entries;
    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      throw new BadRequestException(
        'Entries array is required and must not be empty.',
      );
    }

    // BACK-GEN-01: Validate all keys against whitelist
    const invalidKeys = this.settingsService.validateKeys(
      entries.map((e) => e.key),
    );
    if (invalidKeys.length > 0) {
      throw new BadRequestException(
        `Key tidak dikenali: ${invalidKeys.join(', ')}. Hanya key dengan prefix yang diizinkan yang dapat digunakan.`,
      );
    }

    // BACK-GEN-02: Get old values for audit
    const keys = entries.map((e) => e.key);
    const oldValues = await this.settingsService.getOldValuesForAudit(keys);

    // Perform the update
    await this.settingsService.bulkUpdate(entries);

    // Build new values map (mask sensitive)
    const newValues: Record<string, string> = {};
    for (const entry of entries) {
      newValues[entry.key] = this.settingsService.isSensitiveKey(entry.key)
        ? '••••••••'
        : entry.value;
    }

    // BACK-GEN-02: Log audit trail
    await this.auditService.log(
      user.sub,
      'UPDATE',
      'SystemSetting',
      SETTINGS_AUDIT_ENTITY_ID,
      oldValues,
      newValues,
      this.getIpAddress(req),
    );

    return { success: true, message: 'Settings saved successfully' };
  }

  // ─── SMTP ─────────────────────────────────────────────────────────────────

  @Get('smtp')
  @ApiOperation({ summary: 'Get SMTP settings' })
  async getSmtpSettings() {
    const settings = await this.settingsService.getSettingsByPrefix('smtp_');

    return {
      host: settings['smtp_host'] || '',
      port: parseInt(settings['smtp_port'] || '587', 10),
      secure: settings['smtp_secure'] === 'true',
      user: settings['smtp_user'] || '',
      pass: settings['smtp_pass'] ? '••••••••' : '', // mask password
      senderName: settings['smtp_sender_name'] || 'eLIS Laboratory',
      senderEmail: settings['smtp_sender_email'] || '',
    };
  }

  @Put('smtp')
  @ApiOperation({ summary: 'Update SMTP settings' })
  async updateSmtpSettings(
    @Body() dto: SmtpSettingsDto,
    @CurrentUser() user: { sub: string; role: string },
    @Req() req: express.Request,
  ) {
    // Get old values for audit
    const oldValues = await this.settingsService.getOldValuesForAudit([
      'smtp_host',
      'smtp_port',
      'smtp_secure',
      'smtp_user',
      'smtp_pass',
      'smtp_sender_name',
      'smtp_sender_email',
    ]);

    const entries: { key: string; value: string }[] = [
      { key: 'smtp_host', value: dto.host },
      { key: 'smtp_port', value: String(dto.port) },
      { key: 'smtp_secure', value: String(dto.secure) },
      { key: 'smtp_user', value: dto.user },
      { key: 'smtp_sender_name', value: dto.senderName },
      { key: 'smtp_sender_email', value: dto.senderEmail },
    ];

    // Only update password if it's not the masked placeholder
    // BACK-GEN-03: Password will be encrypted by SettingsService.bulkUpdate()
    if (dto.pass && dto.pass !== '••••••••') {
      entries.push({ key: 'smtp_pass', value: dto.pass });
    }

    await this.settingsService.bulkUpdate(entries);

    // BACK-GEN-02: Audit trail (mask password in new values)
    const newValues: Record<string, string> = {};
    for (const entry of entries) {
      newValues[entry.key] = this.settingsService.isSensitiveKey(entry.key)
        ? '••••••••'
        : entry.value;
    }

    await this.auditService.log(
      user.sub,
      'UPDATE',
      'SystemSetting',
      SETTINGS_AUDIT_ENTITY_ID,
      oldValues,
      newValues,
      this.getIpAddress(req),
    );

    return { success: true, message: 'SMTP settings saved successfully' };
  }

  @Post('smtp/test')
  @ApiOperation({ summary: 'Send test email to verify SMTP settings' })
  async testSmtp(@Body() body: { email: string }) {
    const result = await this.emailService.sendTestEmail(body.email);
    return result;
  }

  // ─── General Settings ───────────────────────────────────────────────────────

  @Get('general')
  @ApiOperation({ summary: 'Get general system settings' })
  async getGeneralSettings() {
    const settings = await this.settingsService.getSettingsByPrefix('general_');

    return {
      // Facility identity (BIZ-GEN-01)
      facilityName: settings['general_facility_name'] || '',
      facilityCode: settings['general_facility_code'] || '',
      facilityType: settings['general_facility_type'] || 'STANDALONE_LAB',
      address: settings['general_address'] || '',
      city: settings['general_city'] || '',
      province: settings['general_province'] || '',
      postalCode: settings['general_postal_code'] || '',
      phone: settings['general_phone'] || '',
      fax: settings['general_fax'] || '',
      email: settings['general_email'] || '',
      website: settings['general_website'] || '',
      npwp: settings['general_npwp'] || '',
      licenseNumber: settings['general_license_number'] || '',
      accreditation: settings['general_accreditation'] || '',

      // Logo & Branding (BIZ-GEN-02)
      logoUrl: settings['general_logo_url'] || '',
      logoSmallUrl: settings['general_logo_small_url'] || '',
      reportHeaderImage: settings['general_report_header_image'] || '',

      // Regional (BIZ-GEN-03)
      timezone: settings['general_timezone'] || 'Asia/Jakarta',
      dateFormat: settings['general_date_format'] || 'DD/MM/YYYY',
      currency: settings['general_currency'] || 'IDR',
      locale: settings['general_locale'] || 'id-ID',
      numberFormat: settings['general_number_format'] || '1.000,50',

      // Numbering (BIZ-GEN-04)
      orderNumberFormat:
        settings['general_order_number_format'] || 'LAB-{YYYY}{MM}-{SEQ:5}',
      orderNumberReset: settings['general_order_number_reset'] || 'MONTHLY',
      visitNumberFormat:
        settings['general_visit_number_format'] || 'VIS-{YYYY}{MM}{DD}-{SEQ:4}',
      invoiceNumberFormat:
        settings['general_invoice_number_format'] || 'INV/{YYYY}/{SEQ:4}',
      mrnFormat: settings['general_mrn_format'] || 'MRN-{YYYY}-{SEQ:6}',

      // Operational (BIZ-GEN-05)
      operatingHoursStart: settings['general_operating_hours_start'] || '07:00',
      operatingHoursEnd: settings['general_operating_hours_end'] || '21:00',
      operatingDays:
        settings['general_operating_days'] || 'MON,TUE,WED,THU,FRI,SAT',
      is24h: settings['general_is_24h'] === 'true',

      // Session & Security (BIZ-GEN-06)
      sessionTimeoutMinutes: parseInt(
        settings['general_session_timeout_minutes'] || '60',
        10,
      ),
      autoLogoutIdleMinutes: parseInt(
        settings['general_auto_logout_idle_minutes'] || '30',
        10,
      ),
      maxLoginAttempts: parseInt(
        settings['general_max_login_attempts'] || '5',
        10,
      ),
      lockoutDurationMinutes: parseInt(
        settings['general_lockout_duration_minutes'] || '30',
        10,
      ),
      passwordMinLength: parseInt(
        settings['general_password_min_length'] || '8',
        10,
      ),
      requirePasswordChangeDays: parseInt(
        settings['general_require_password_change_days'] || '0',
        10,
      ),

      // Maintenance & Backup (BIZ-GEN-07)
      maintenanceMode: settings['general_maintenance_mode'] === 'true',
      maintenanceMessage: settings['general_maintenance_message'] || '',
      backupScheduleCron:
        settings['general_backup_schedule_cron'] || '0 2 * * *',
      lastBackupAt: settings['general_last_backup_at'] || null,

      // Pagination & Display (BIZ-GEN-08)
      defaultPageSize: parseInt(
        settings['general_default_page_size'] || '20',
        10,
      ),
      defaultSortOrder: settings['general_default_sort_order'] || 'DESC',
      dashboardDataRetentionDays: parseInt(
        settings['general_dashboard_data_retention_days'] || '30',
        10,
      ),
    };
  }

  @Put('general')
  @ApiOperation({ summary: 'Update general system settings' })
  async updateGeneralSettings(
    @Body() dto: GeneralSettingsDto,
    @CurrentUser() user: { sub: string; role: string },
    @Req() req: express.Request,
  ) {
    const entries: { key: string; value: string }[] = [
      // Facility identity (BIZ-GEN-01)
      { key: 'general_facility_name', value: dto.facilityName },
      { key: 'general_facility_code', value: dto.facilityCode || '' },
      {
        key: 'general_facility_type',
        value: dto.facilityType || 'STANDALONE_LAB',
      },
      { key: 'general_address', value: dto.address || '' },
      { key: 'general_city', value: dto.city || '' },
      { key: 'general_province', value: dto.province || '' },
      { key: 'general_postal_code', value: dto.postalCode || '' },
      { key: 'general_phone', value: dto.phone || '' },
      { key: 'general_fax', value: dto.fax || '' },
      { key: 'general_email', value: dto.email || '' },
      { key: 'general_website', value: dto.website || '' },
      { key: 'general_npwp', value: dto.npwp || '' },
      { key: 'general_license_number', value: dto.licenseNumber || '' },
      { key: 'general_accreditation', value: dto.accreditation || '' },

      // Regional (BIZ-GEN-03)
      { key: 'general_timezone', value: dto.timezone || 'Asia/Jakarta' },
      { key: 'general_date_format', value: dto.dateFormat || 'DD/MM/YYYY' },
      { key: 'general_currency', value: dto.currency || 'IDR' },
      { key: 'general_locale', value: dto.locale || 'id-ID' },
      { key: 'general_number_format', value: dto.numberFormat || '1.000,50' },

      // Numbering (BIZ-GEN-04)
      {
        key: 'general_order_number_format',
        value: dto.orderNumberFormat || 'LAB-{YYYY}{MM}-{SEQ:5}',
      },
      {
        key: 'general_order_number_reset',
        value: dto.orderNumberReset || 'MONTHLY',
      },
      {
        key: 'general_visit_number_format',
        value: dto.visitNumberFormat || 'VIS-{YYYY}{MM}{DD}-{SEQ:4}',
      },
      {
        key: 'general_invoice_number_format',
        value: dto.invoiceNumberFormat || 'INV/{YYYY}/{SEQ:4}',
      },
      {
        key: 'general_mrn_format',
        value: dto.mrnFormat || 'MRN-{YYYY}-{SEQ:6}',
      },

      // Operational (BIZ-GEN-05)
      {
        key: 'general_operating_hours_start',
        value: dto.operatingHoursStart || '07:00',
      },
      {
        key: 'general_operating_hours_end',
        value: dto.operatingHoursEnd || '21:00',
      },
      {
        key: 'general_operating_days',
        value: dto.operatingDays || 'MON,TUE,WED,THU,FRI,SAT',
      },
      { key: 'general_is_24h', value: String(dto.is24h ?? false) },

      // Session & Security (BIZ-GEN-06)
      {
        key: 'general_session_timeout_minutes',
        value: String(dto.sessionTimeoutMinutes ?? 60),
      },
      {
        key: 'general_auto_logout_idle_minutes',
        value: String(dto.autoLogoutIdleMinutes ?? 30),
      },
      {
        key: 'general_max_login_attempts',
        value: String(dto.maxLoginAttempts ?? 5),
      },
      {
        key: 'general_lockout_duration_minutes',
        value: String(dto.lockoutDurationMinutes ?? 30),
      },
      {
        key: 'general_password_min_length',
        value: String(dto.passwordMinLength ?? 8),
      },
      {
        key: 'general_require_password_change_days',
        value: String(dto.requirePasswordChangeDays ?? 0),
      },

      // Maintenance & Backup (BIZ-GEN-07)
      {
        key: 'general_maintenance_mode',
        value: String(dto.maintenanceMode ?? false),
      },
      {
        key: 'general_maintenance_message',
        value: dto.maintenanceMessage || '',
      },
      {
        key: 'general_backup_schedule_cron',
        value: dto.backupScheduleCron || '0 2 * * *',
      },

      // Pagination & Display (BIZ-GEN-08)
      {
        key: 'general_default_page_size',
        value: String(dto.defaultPageSize ?? 20),
      },
      {
        key: 'general_default_sort_order',
        value: dto.defaultSortOrder || 'DESC',
      },
      {
        key: 'general_dashboard_data_retention_days',
        value: String(dto.dashboardDataRetentionDays ?? 30),
      },
    ];

    // BACK-GEN-02: Get old values for audit
    const keys = entries.map((e) => e.key);
    const oldValues = await this.settingsService.getOldValuesForAudit(keys);

    await this.settingsService.bulkUpdate(entries);

    // BACK-GEN-02: Audit trail
    const newValues: Record<string, string> = {};
    for (const entry of entries) {
      newValues[entry.key] = entry.value;
    }

    await this.auditService.log(
      user.sub,
      'UPDATE',
      'SystemSetting',
      SETTINGS_AUDIT_ENTITY_ID,
      oldValues,
      newValues,
      this.getIpAddress(req),
    );

    return { success: true, message: 'General settings saved successfully' };
  }

  // ─── Logo Upload (BIZ-GEN-02) ──────────────────────────────────────────────

  @Post('general/logo')
  @ApiOperation({ summary: 'Upload facility logo' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
      fileFilter: (_req, file, cb) => {
        const allowedMimes = [
          'image/png',
          'image/jpeg',
          'image/svg+xml',
          'image/webp',
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `Tipe file tidak didukung: ${file.mimetype}. Gunakan PNG, JPEG, SVG, atau WebP.`,
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadLogo(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { type?: string },
    @CurrentUser() user: { sub: string; role: string },
    @Req() req: express.Request,
  ) {
    if (!file) {
      throw new BadRequestException('File tidak ditemukan.');
    }

    const logoType = body.type || 'logo'; // logo, logo_small, report_header
    const validTypes = ['logo', 'logo_small', 'report_header'];
    if (!validTypes.includes(logoType)) {
      throw new BadRequestException(`Tipe logo tidak valid: ${logoType}`);
    }

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads', 'branding');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate filename with timestamp to avoid cache issues
    const ext = path.extname(file.originalname) || '.png';
    const filename = `${logoType}_${Date.now()}${ext}`;
    const filePath = path.join(uploadsDir, filename);

    // Write file to disk
    fs.writeFileSync(filePath, file.buffer);

    // Save the relative URL path in settings
    const urlPath = `/uploads/branding/${filename}`;
    const settingsKey = `general_${logoType}_url`;

    // Get old value for audit
    const oldUrl = await this.settingsService.getSetting(settingsKey);

    await this.settingsService.setSetting(settingsKey, urlPath);

    // BACK-GEN-02: Audit trail for logo upload
    await this.auditService.log(
      user.sub,
      'UPDATE',
      'SystemSetting',
      SETTINGS_AUDIT_ENTITY_ID,
      { [settingsKey]: oldUrl || '' },
      { [settingsKey]: urlPath },
      this.getIpAddress(req),
    );

    return {
      success: true,
      message: 'Logo berhasil diupload',
      data: { url: urlPath, type: logoType },
    };
  }

  // ─── Export / Import Settings (T-19) ────────────────────────────────────────

  @Get('export')
  @ApiOperation({ summary: 'Export all settings as JSON backup' })
  async exportSettings() {
    const allSettings = await this.settingsService.getSettingsByPrefix('');

    // Mask sensitive values in export
    const exportData: Record<string, string> = {};
    for (const [key, value] of Object.entries(allSettings)) {
      if (this.settingsService.isSensitiveKey(key)) {
        exportData[key] = ''; // Exclude sensitive values from export
      } else {
        exportData[key] = value;
      }
    }

    return {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      settingsCount: Object.keys(exportData).length,
      data: exportData,
    };
  }

  @Post('import')
  @ApiOperation({ summary: 'Import settings from JSON backup' })
  async importSettings(
    @Body() body: { data: Record<string, string>; overwrite?: boolean },
    @CurrentUser() user: { sub: string; role: string },
    @Req() req: express.Request,
  ) {
    const { data, overwrite = false } = body;

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new BadRequestException(
        'Field "data" harus berupa object key-value.',
      );
    }

    const entries = Object.entries(data);
    if (entries.length === 0) {
      throw new BadRequestException('Data import kosong.');
    }

    if (entries.length > 200) {
      throw new BadRequestException('Maksimal 200 settings per import.');
    }

    // Validate all keys against whitelist
    const keys = entries.map(([key]) => key);
    const invalidKeys = this.settingsService.validateKeys(keys);
    if (invalidKeys.length > 0) {
      throw new BadRequestException(
        `Key tidak dikenali: ${invalidKeys.slice(0, 5).join(', ')}${invalidKeys.length > 5 ? ` dan ${invalidKeys.length - 5} lainnya` : ''}`,
      );
    }

    // Filter out sensitive keys from import (security: prevent importing passwords)
    const safeEntries = entries.filter(
      ([key]) => !this.settingsService.isSensitiveKey(key),
    );

    if (!overwrite) {
      // Only import keys that don't already exist
      const existingSettings =
        await this.settingsService.getSettingsByPrefix('');
      const newEntries = safeEntries.filter(
        ([key]) => !(key in existingSettings),
      );

      if (newEntries.length === 0) {
        return {
          success: true,
          message:
            'Tidak ada settings baru untuk diimport (semua key sudah ada).',
          imported: 0,
          skipped: safeEntries.length,
        };
      }

      const oldValues = await this.settingsService.getOldValuesForAudit(
        newEntries.map(([k]) => k),
      );
      await this.settingsService.bulkUpdate(
        newEntries.map(([key, value]) => ({ key, value })),
      );

      const newValues: Record<string, string> = {};
      for (const [key, value] of newEntries) {
        newValues[key] = value;
      }

      await this.auditService.log(
        user.sub,
        'IMPORT',
        'SystemSetting',
        SETTINGS_AUDIT_ENTITY_ID,
        oldValues,
        newValues,
        this.getIpAddress(req),
      );

      return {
        success: true,
        message: `${newEntries.length} settings berhasil diimport.`,
        imported: newEntries.length,
        skipped: safeEntries.length - newEntries.length,
      };
    }

    // Overwrite mode: import all safe entries
    const oldValues = await this.settingsService.getOldValuesForAudit(
      safeEntries.map(([k]) => k),
    );
    await this.settingsService.bulkUpdate(
      safeEntries.map(([key, value]) => ({ key, value })),
    );

    const newValues: Record<string, string> = {};
    for (const [key, value] of safeEntries) {
      newValues[key] = value;
    }

    await this.auditService.log(
      user.sub,
      'IMPORT',
      'SystemSetting',
      SETTINGS_AUDIT_ENTITY_ID,
      oldValues,
      newValues,
      this.getIpAddress(req),
    );

    return {
      success: true,
      message: `${safeEntries.length} settings berhasil diimport (overwrite mode).`,
      imported: safeEntries.length,
      skipped: entries.length - safeEntries.length,
    };
  }
}
