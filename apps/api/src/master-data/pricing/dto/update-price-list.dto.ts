import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsBoolean,
  IsIn,
} from 'class-validator';

/**
 * DTO for updating an existing PriceList.
 * All fields are optional — only provided fields will be updated.
 *
 * Requirements: 7.2, 7.3
 */
export class UpdatePriceListDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @IsIn(['CORPORATE', 'INSURANCE', 'PROMOTION', 'PACKAGE'])
  type?: string;

  @IsOptional()
  @IsUUID()
  entityId?: string;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
