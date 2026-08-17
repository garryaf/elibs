import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateAddendumDto {
  @IsNotEmpty({ message: 'content is required' })
  @IsString()
  @MaxLength(5000, { message: 'content must not exceed 5000 characters' })
  content: string;
}
