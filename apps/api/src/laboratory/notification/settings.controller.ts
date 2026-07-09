import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailService } from './email.service';

interface SmtpSettingsDto {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  senderName: string;
  senderEmail: string;
}

@Controller('api/v1/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class SettingsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  @Get('smtp')
  async getSmtpSettings() {
    const settings = await this.prisma.systemSetting.findMany({
      where: {
        key: {
          startsWith: 'smtp_',
        },
      },
    });

    const map = new Map(settings.map((s) => [s.key, s.value]));

    return {
      host: map.get('smtp_host') || '',
      port: parseInt(map.get('smtp_port') || '587', 10),
      secure: map.get('smtp_secure') === 'true',
      user: map.get('smtp_user') || '',
      pass: map.get('smtp_pass') ? '••••••••' : '', // mask password
      senderName: map.get('smtp_sender_name') || 'eLIS Laboratory',
      senderEmail: map.get('smtp_sender_email') || '',
    };
  }

  @Put('smtp')
  async updateSmtpSettings(@Body() dto: SmtpSettingsDto) {
    const entries = [
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

    for (const entry of entries) {
      await this.prisma.systemSetting.upsert({
        where: { key: entry.key },
        update: { value: entry.value },
        create: { key: entry.key, value: entry.value },
      });
    }

    return { success: true, message: 'SMTP settings saved successfully' };
  }

  @Post('smtp/test')
  async testSmtp(@Body() body: { email: string }) {
    const result = await this.emailService.sendTestEmail(body.email);
    return result;
  }
}
