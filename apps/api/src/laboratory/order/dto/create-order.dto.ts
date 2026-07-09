import {
  IsUUID,
  IsArray,
  ArrayMinSize,
  IsOptional,
} from 'class-validator';

export class CreateOrderDto {
  @IsUUID()
  patientId: string;

  @IsUUID()
  @IsOptional()
  clinicId?: string;

  @IsUUID()
  @IsOptional()
  doctorId?: string;

  @IsUUID()
  @IsOptional()
  insuranceId?: string;

  @IsUUID()
  @IsOptional()
  visitId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  testIds: string[];
}
