import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class ProcessFallbackPaymentDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
