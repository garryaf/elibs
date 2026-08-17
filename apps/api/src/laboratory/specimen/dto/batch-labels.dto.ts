import { IsArray, ArrayMinSize, IsUUID } from 'class-validator';

export class BatchLabelsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  specimenIds: string[];
}
