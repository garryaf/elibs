import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Response } from 'express';
import { PrismaService } from '../common/prisma/prisma.service';
import { MetricsService } from './metrics.service';

@ApiTags('Health')
@Controller('api/v1/health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsService: MetricsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check with database connectivity status' })
  async check() {
    const checks: Record<string, string> = {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };

    // Database connectivity check
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'connected';
    } catch {
      checks.database = 'disconnected';
      checks.status = 'degraded';
    }

    return checks;
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get Prometheus metrics' })
  async getMetrics(@Res() res: Response) {
    const metrics = await this.metricsService.getMetrics();
    res.set('Content-Type', this.metricsService.getContentType());
    res.send(metrics);
  }
}
