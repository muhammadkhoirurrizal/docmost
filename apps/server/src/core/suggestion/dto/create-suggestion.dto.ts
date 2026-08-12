import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateSuggestionDto {
  @IsString()
  @IsNotEmpty()
  pageId: string;

  @IsString()
  @IsOptional()
  originalText?: string | null;

  @IsString()
  @IsNotEmpty()
  suggestedText: string;

  @IsInt()
  @Min(0)
  startIndex: number;

  @IsInt()
  @Min(0)
  endIndex: number;
}
