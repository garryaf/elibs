import { Module, OnModuleInit } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditArchivalService } from './audit-archival.service';
import { AuditArchivalProcessor } from './audit-archival.processor';
import { PrismaService } from '../../common/prisma/prisma.service';
import { registerAuditLogMiddleware } from './audit-log.middleware';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'audit-archival' }),
  ],
  controllers: [AuditController],
  providers: [AuditService, AuditArchivalService, AuditArchivalProcessor],
  exports: [AuditService, AuditArchivalService],
})
export class AuditModule implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    registerAuditLogMiddleware(this.prisma);
  }
}
