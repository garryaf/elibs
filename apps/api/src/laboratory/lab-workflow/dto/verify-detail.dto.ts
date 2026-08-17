import { IsOptional, IsString, MaxLength } from 'class-validator';

export class VerifyDetailDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  verificationNotes?: string;
}
