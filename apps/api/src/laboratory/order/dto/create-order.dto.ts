import {
  IsUUID,
  IsArray,
  ArrayMinSize,
  IsOptional,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateOrderDto {
  /**
   * UUID of the Visit this order belongs to.
   * Required — every order must be linked to a valid Visit.
   * The referenced Visit must be in REGISTERED or IN_PROGRESS status.
   *
   * @required true
   * @format uuid
   * @example "550e8400-e29b-41d4-a716-446655440000"
   */
  @IsNotEmpty({ message: 'visitId is required. Create a Visit first via POST /api/v1/visits' })
  @IsUUID('4', { message: 'visitId must be a valid UUID' })
  visitId: string;

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

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  testIds: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
