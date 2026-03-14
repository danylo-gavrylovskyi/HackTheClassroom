import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class CompleteSessionDto {
  @IsArray()
  scores_json: Array<{
    question_id: number;
    score: number;
    hints_given: number;
    comment: string;
  }>;

  @IsString()
  summary_text: string;

  @IsNumber()
  total_score: number;

  @IsNumber()
  max_score: number;

  @IsOptional()
  @IsString()
  transcript_text?: string;
}
