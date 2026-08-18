import { IsEnum, IsNotEmpty } from 'class-validator';

export enum SuggestionStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

export class UpdateSuggestionDto {
  @IsEnum(SuggestionStatus)
  @IsNotEmpty()
  status: SuggestionStatus;
}
