import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ApprovalType, ApprovalStatus } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ApprovalService } from './approval.service';
import { CreateApprovalDto } from './dto/create-approval.dto';
import { ApproveApprovalDto } from './dto/approve-approval.dto';
import { RejectApprovalDto } from './dto/reject-approval.dto';

@ApiTags('Approvals')
@ApiBearerAuth()
@Controller('api/v1/approvals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApprovalController {
  constructor(private readonly approvalService: ApprovalService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new approval request' })
  async create(@Body() dto: CreateApprovalDto) {
    return this.approvalService.create(dto);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve the current level of an approval request' })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveApprovalDto,
  ) {
    return this.approvalService.approve(id, dto);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject an approval request with a reason' })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectApprovalDto,
  ) {
    return this.approvalService.reject(id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List approval requests with optional filters' })
  async findAll(
    @Query('type') type?: ApprovalType,
    @Query('status') status?: ApprovalStatus,
  ) {
    return this.approvalService.findAll({
      requestType: type,
      status,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single approval request with all steps' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.approvalService.findOne(id);
  }
}
