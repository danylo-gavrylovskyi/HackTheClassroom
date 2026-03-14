import { IsString, IsArray, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QuestionDto {
  @IsNumber()
  id: number;

  @IsString()
  question: string;

  @IsString()
  reference_answer: string;

  @IsNumber()
  @Min(1)
  max_score: number;
}

export class CreateExamDto {
  @IsString()
  title: string;

  @IsString()
  subject: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionDto)
  questions: QuestionDto[];
}
