import { IsEmail, IsEnum, IsOptional, IsString, IsUUID, MinLength, ValidateIf } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEnum(Role)
  role: Role;

  @IsOptional()
  @IsString()
  name?: string;

  @ValidateIf((o) => o.role === 'KLINIK_PARTNER')
  @IsUUID('4', { message: 'clinicId wajib diisi untuk role KLINIK_PARTNER' })
  clinicId?: string;
}
