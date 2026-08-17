import { IsOptional, IsUUID, IsString, IsDateString } from 'class-validator';

/**
 * DTO for providing pricing resolution context.
 * All fields are optional — the service resolves the best matching price
 * based on whichever context values are provided.
 *
 * Requirements: 7.1, 7.2
 */
export class PricingContextDto {
  @IsOptional()
  @IsUUID()
  clinicId?: string;

  @IsOptional()
  @IsUUID()
  insuranceId?: string;

  @IsOptional()
  @IsUUID()
  corporateId?: string;

  @IsOptional()
  @IsUUID()
  packageId?: string;

  @IsOptional()
  @IsString()
  promotionCode?: string;

  @IsOptional()
  @IsDateString()
  asOfDate?: string;
}
