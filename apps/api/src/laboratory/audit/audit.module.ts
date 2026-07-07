import { Module, OnModuleInit } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { registerAuditLogMiddleware } from './audit-log.middleware';

@Module({
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    registerAuditLogMiddleware(this.prisma);
  }
}
