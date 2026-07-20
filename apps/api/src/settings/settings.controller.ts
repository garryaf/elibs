import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsEmail,
  IsOptional,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { SettingsService } from './settings.service';
import { EmailService } from '../laboratory/notification/email.service';

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

@ApiTags('Settings')
@ApiBearerAuth()
@Controller('api/v1/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * GET /api/v1/settings?prefix=notification.
   * Generic key-value settings retrieval by prefix.
   */
  @Get()
  @ApiOperation({ summary: 'Get settings by prefix' })
  @ApiQuery({ name: 'prefix', required: false, description: 'Key prefix filter' })
  async getSettings(@Query('prefix') prefix?: string) {
    if (prefix) {
      return this.settingsService.getSettingsByPrefix(prefix);
    }
    // Return all settings if no prefix
    return this.settingsService.getSettingsByPrefix('');
  }

  /**
   * PUT /api/v1/settings/bulk
   * Bulk upsert settings.
   */
  @Put('bulk')
  @ApiOperation({ summary: 'Bulk update settings' })
  async bulkUpdateSettings(@Body() body: { entries: { key: string; value: string }[] }) {
    await this.settingsService.bulkUpdate(body.entries);
    return { success: true, message: 'Settings saved successfully' };
  }

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
  async updateSmtpSettings(@Body() dto: SmtpSettingsDto) {
    const entries: { key: string; value: string }[] = [
      { key: 'smtp_host', value: dto.host },
      { key: 'smtp_port', value: String(dto.port) },
      { key: 'smtp_secure', value: String(dto.secure) },
      { key: 'smtp_user', value: dto.user },
      { key: 'smtp_sender_name', value: dto.senderName },
      { key: 'smtp_sender_email', value: dto.senderEmail },
    ];

    // Only update password if it's not the masked placeholder
    if (dto.pass && dto.pass !== '••••••••') {
      entries.push({ key: 'smtp_pass', value: dto.pass });
    }

    await this.settingsService.bulkUpdate(entries);

    return { success: true, message: 'SMTP settings saved successfully' };
  }

  @Post('smtp/test')
  @ApiOperation({ summary: 'Send test email to verify SMTP settings' })
  async testSmtp(@Body() body: { email: string }) {
    const result = await this.emailService.sendTestEmail(body.email);
    return result;
  }
}
