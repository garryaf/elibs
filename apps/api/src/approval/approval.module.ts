import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { ApprovalController } from './approval.controller';
import { ApprovalService } from './approval.service';
import { APPROVAL_SERVICE } from './interfaces/approval.interface';

@Module({
  imports: [PrismaModule],
  controllers: [ApprovalController],
  providers: [
    ApprovalService,
    {
      provide: APPROVAL_SERVICE,
      useExisting: ApprovalService,
    },
  ],
  exports: [ApprovalService, APPROVAL_SERVICE],
})
export class ApprovalModule {}
