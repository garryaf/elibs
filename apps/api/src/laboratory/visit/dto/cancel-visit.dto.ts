import { IsString, MinLength } from 'class-validator';

export class CancelVisitDto {
  @IsString()
  @MinLength(1)
  reason: string;
}
