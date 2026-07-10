import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  ParseUUIDPipe,
  Logger,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrderService } from './order.service';
import { ClaimService } from './claim.service';
import { InsuranceRejectionService } from './insurance-rejection.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { AddOrderInsuranceDto, UpdateOrderInsuranceDto } from './dto/manage-order-insurance.dto';
import { CreateBpjsOrderDetailDto, UpdateBpjsOrderDetailDto, VerifyBpjsDto } from './dto/bpjs-order-detail.dto';
import { SubmitClaimDto, ApproveClaimDto, RejectClaimDto } from './dto/claim.dto';
import { ProcessFallbackPaymentDto } from './dto/fallback-payment.dto';
import { VisitIdDeprecationInterceptor } from './interceptors/visit-id-deprecation.interceptor';

@Controller('api/v1/orders')
export class OrderController {
  private readonly logger = new Logger(OrderController.name);

  constructor(
    private readonly orderService: OrderService,
    private readonly claimService: ClaimService,
    private readonly insuranceRejectionService: InsuranceRejectionService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(VisitIdDeprecationInterceptor)
  @Roles(Role.KASIR, Role.ADMIN, Role.KLINIK_PARTNER)
  async create(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.orderService.create(dto, user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KASIR, Role.CS, Role.ADMIN, Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER, Role.SAMPLING, Role.ANALIS, Role.DOKTER, Role.KLINIK_PARTNER)
  async findAll(@Query() query: OrderQueryDto) {
    return this.orderService.findAll(query);
  }

  // ─── Insurance Rejection Fallback Endpoints (static routes before :id) ─────

  @Get('overdue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KASIR, Role.ADMIN, Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER)
  async getOverdueOrders() {
    return this.insuranceRejectionService.getOverdueOrders();
  }

  @Post('check-overdue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async checkOverduePayments() {
    return this.insuranceRejectionService.checkOverduePayments();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KASIR, Role.CS, Role.ADMIN, Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER, Role.SAMPLING, Role.ANALIS, Role.DOKTER, Role.KLINIK_PARTNER)
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.orderService.findById(id);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KASIR, Role.ADMIN, Role.SUPER_ADMIN)
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.orderService.cancel(id, dto, user.id);
  }

  // ─── Order Insurance Coverage Endpoints ────────────────────────────────────

  @Get(':id/insurances')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KASIR, Role.CS, Role.ADMIN, Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER)
  async getOrderInsurances(@Param('id', ParseUUIDPipe) id: string) {
    return this.orderService.getOrderInsurances(id);
  }

  @Post(':id/insurances')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KASIR, Role.ADMIN, Role.SUPER_ADMIN)
  async addOrderInsurance(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddOrderInsuranceDto,
  ) {
    return this.orderService.addOrderInsurance(id, dto);
  }

  @Put('insurances/:insuranceId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KASIR, Role.ADMIN, Role.SUPER_ADMIN)
  async updateOrderInsurance(
    @Param('insuranceId', ParseUUIDPipe) insuranceId: string,
    @Body() dto: UpdateOrderInsuranceDto,
  ) {
    return this.orderService.updateOrderInsurance(insuranceId, dto);
  }

  @Delete('insurances/:insuranceId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async removeOrderInsurance(
    @Param('insuranceId', ParseUUIDPipe) insuranceId: string,
  ) {
    return this.orderService.removeOrderInsurance(insuranceId);
  }

  // ─── BPJS Order Detail Endpoints ──────────────────────────────────────────

  @Get(':id/bpjs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KASIR, Role.CS, Role.ADMIN, Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER, Role.SAMPLING, Role.ANALIS, Role.DOKTER)
  async getBpjsDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.orderService.getBpjsDetail(id);
  }

  @Post(':id/bpjs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KASIR, Role.ADMIN, Role.SUPER_ADMIN)
  async createBpjsDetail(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateBpjsOrderDetailDto,
  ) {
    return this.orderService.createBpjsDetail(id, dto);
  }

  @Put(':id/bpjs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KASIR, Role.ADMIN, Role.SUPER_ADMIN)
  async updateBpjsDetail(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBpjsOrderDetailDto,
  ) {
    return this.orderService.updateBpjsDetail(id, dto);
  }

  @Post(':id/bpjs/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KASIR, Role.ADMIN, Role.SUPER_ADMIN)
  async verifyBpjs(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerifyBpjsDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.orderService.verifyBpjs(id, dto, user.id);
  }

  // ─── Claim Lifecycle Endpoints ─────────────────────────────────────────────

  @Get(':id/claims')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KASIR, Role.CS, Role.ADMIN, Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER)
  async getClaimHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.claimService.getClaimHistory(id);
  }

  @Post(':id/claims/submit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KASIR, Role.ADMIN, Role.SUPER_ADMIN)
  async submitClaim(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitClaimDto,
  ) {
    return this.claimService.submitClaim(dto);
  }

  @Put('claims/:claimId/review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KASIR, Role.ADMIN, Role.SUPER_ADMIN)
  async reviewClaim(@Param('claimId', ParseUUIDPipe) claimId: string) {
    return this.claimService.reviewClaim(claimId);
  }

  @Put('claims/:claimId/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KASIR, Role.ADMIN, Role.SUPER_ADMIN)
  async approveClaim(
    @Param('claimId', ParseUUIDPipe) claimId: string,
    @Body() dto: ApproveClaimDto,
  ) {
    return this.claimService.approveClaim(claimId, dto);
  }

  @Put('claims/:claimId/partially-approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KASIR, Role.ADMIN, Role.SUPER_ADMIN)
  async partiallyApproveClaim(
    @Param('claimId', ParseUUIDPipe) claimId: string,
    @Body() dto: ApproveClaimDto,
  ) {
    return this.claimService.partiallyApproveClaim(claimId, dto);
  }

  @Put('claims/:claimId/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KASIR, Role.ADMIN, Role.SUPER_ADMIN)
  async rejectClaim(
    @Param('claimId', ParseUUIDPipe) claimId: string,
    @Body() dto: RejectClaimDto,
  ) {
    const result = await this.claimService.rejectClaim(claimId, dto);

    // Trigger 72-hour cash fallback workflow after rejection
    try {
      await this.insuranceRejectionService.initiateClaimRejectionFallback(claimId);
    } catch (error) {
      this.logger.warn(
        `Failed to initiate fallback workflow for claim ${claimId}: ${error.message}`,
      );
    }

    return result;
  }

  @Put('claims/:claimId/paid')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KASIR, Role.ADMIN, Role.SUPER_ADMIN)
  async markClaimPaid(@Param('claimId', ParseUUIDPipe) claimId: string) {
    return this.claimService.markClaimPaid(claimId);
  }

  // ─── Fallback Payment Endpoint ─────────────────────────────────────────────

  @Post(':id/fallback-payment')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.KASIR, Role.ADMIN, Role.SUPER_ADMIN)
  async processFallbackPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProcessFallbackPaymentDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.insuranceRejectionService.processFallbackPayment(
      id,
      dto.amount,
      user.id,
      dto.reference,
      dto.notes,
    );
  }
}
