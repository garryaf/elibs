import { IsUUID, IsNumber, IsOptional, Min, Max } from 'class-validator';

/**
 * DTO for adding an item to a PriceList.
 * Each item maps a test to a specific price within the price list,
 * with an optional discount percentage.
 *
 * Requirements: 7.1, 7.2
 */
export class CreatePriceListItemDto {
  @IsUUID()
  priceListId: string;

  @IsUUID()
  testId: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discount?: number;
}
