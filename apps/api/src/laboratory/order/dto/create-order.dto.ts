import {
  IsUUID,
  IsArray,
  ArrayMinSize,
  IsOptional,
  IsNotEmpty,
  IsString,
  IsEnum,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { OrderPriority } from '@prisma/client';

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

  /**
   * Array of test UUIDs to include in the order.
   * At least one of testIds or panelIds must be provided.
   */
  @ValidateIf((o) => !o.panelIds || o.panelIds.length === 0)
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one of testIds or panelIds must be provided' })
  @IsUUID('4', { each: true })
  testIds: string[];

  /**
   * Optional array of panel UUIDs. Each panel will be expanded into its
   * constituent tests via the PanelTest junction table.
   * Tests from panels are merged with testIds and deduplicated.
   */
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  panelIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  /**
   * Priority level for the order. Defaults to ROUTINE if not specified.
   * ROUTINE — normal processing order
   * URGENT — expedited processing
   * CITO — immediate processing required
   */
  @IsOptional()
  @IsEnum(OrderPriority, {
    message: 'priority must be one of: ROUTINE, URGENT, CITO',
  })
  priority?: OrderPriority;
}
