import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsBoolean,
  IsIn,
  IsNotEmpty,
} from 'class-validator';

/**
 * DTO for creating a new PriceList.
 * A price list defines a set of test prices for a specific entity type
 * (corporate, insurance, promotion, or package) within a validity period.
 *
 * Requirements: 7.1, 7.2
 */
export class CreatePriceListDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsIn(['CORPORATE', 'INSURANCE', 'PROMOTION', 'PACKAGE'])
  type: string;

  @IsOptional()
  @IsUUID()
  entityId?: string;

  @IsDateString()
  effectiveFrom: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
