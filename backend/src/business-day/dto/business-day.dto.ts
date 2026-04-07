import { IsOptional, IsString } from 'class-validator';

export class OpenBusinessDayDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CloseBusinessDayDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
