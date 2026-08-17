import { IsUUID, IsNumber, IsString, IsNotEmpty, IsOptional, Min, Max } from 'class-validator';

/**
 * DTO for creating a DISCOUNT approval request.
 * Used with POST /api/v1/approvals/discount
 */
export class CreateDiscountApprovalDto {
  @IsUUID()
  @IsOptional()
  requesterId?: string;

  @IsUUID()
  orderId: string;

  @IsNumber()
  @Min(0.01)
  @Max(100)
  discountPercent: number;

  @IsNumber()
  @Min(0.01)
  discountAmount: number;

  @IsString()
  @IsNotEmpty()
  discountReason: string;
}
