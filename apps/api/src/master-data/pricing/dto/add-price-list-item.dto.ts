import { IsUUID, IsNumber, IsOptional, Min, Max } from 'class-validator';

/**
 * DTO for adding an item to a price list via the :id/items endpoint.
 * The priceListId comes from the URL parameter.
 *
 * Requirements: 7.1, 7.2
 */
export class AddPriceListItemDto {
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
