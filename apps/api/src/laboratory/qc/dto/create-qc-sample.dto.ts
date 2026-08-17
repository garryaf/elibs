import {
  IsString,
  IsOptional,
  IsInt,
  IsDateString,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

export class CreateQCSampleDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(50)
  lotNumber: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsInt()
  @Min(1)
  @Max(3)
  level: number;

  @IsDateString()
  expiryDate: string;
}
