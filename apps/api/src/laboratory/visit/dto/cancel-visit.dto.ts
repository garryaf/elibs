import { IsString, MinLength } from 'class-validator';

export class CancelVisitDto {
  @IsString()
  @MinLength(10, { message: 'Alasan pembatalan minimal 10 karakter' })
  reason: string;
}
