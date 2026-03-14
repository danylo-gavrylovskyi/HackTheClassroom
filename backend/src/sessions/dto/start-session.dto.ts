import { IsString, MinLength } from 'class-validator';

export class StartSessionDto {
  @IsString()
  @MinLength(1)
  student_name: string;
}
