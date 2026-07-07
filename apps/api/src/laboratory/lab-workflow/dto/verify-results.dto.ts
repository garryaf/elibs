import { IsOptional, IsString } from 'class-validator';

export class VerifyResultsDto {
  @IsOptional()
  @IsString()
  verificationNotes?: string;
}
