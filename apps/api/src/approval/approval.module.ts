import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AuditModule } from '../laboratory/audit/audit.module';
import { ApprovalController } from './approval.controller';
import { DiscountApprovalController } from './discount-approval.controller';
import { ApprovalService } from './approval.service';
import { DiscountApprovalService } from './discount-approval.service';
import { APPROVAL_SERVICE } from './interfaces/approval.interface';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [ApprovalController, DiscountApprovalController],
  providers: [
    ApprovalService,
    DiscountApprovalService,
    {
      provide: APPROVAL_SERVICE,
      useExisting: ApprovalService,
    },
  ],
  exports: [ApprovalService, DiscountApprovalService, APPROVAL_SERVICE],
})
export class ApprovalModule {}
