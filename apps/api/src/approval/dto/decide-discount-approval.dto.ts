import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum DiscountDecision {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

/**
 * DTO for approving or rejecting a DISCOUNT approval request.
 * Used with POST /api/v1/approvals/discount/:id/decide
 */
export class DecideDiscountApprovalDto {
  @IsEnum(DiscountDecision)
  decision: DiscountDecision;

  @IsString()
  @IsOptional()
  comment?: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
