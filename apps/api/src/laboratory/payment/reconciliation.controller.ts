import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReconciliationService } from './reconciliation.service';
import { ReconcilePaymentsDto } from './dto/reconcile-payment.dto';

@ApiTags('Payment Reconciliation')
@ApiBearerAuth()
@Controller('api/v1/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Post('reconcile')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER, Role.KASIR)
  @ApiOperation({ summary: 'Batch reconcile payment components' })
  async reconcilePayments(
    @Body() dto: ReconcilePaymentsDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.reconciliationService.reconcilePayments(dto, user.id);
  }
}
