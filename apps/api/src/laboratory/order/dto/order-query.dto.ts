import { IsOptional, IsEnum, IsDateString, IsNumberString, IsUUID } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class OrderQueryDto {
  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  sortBy?: string;

  @IsOptional()
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @IsUUID()
  visitId?: string;
}
