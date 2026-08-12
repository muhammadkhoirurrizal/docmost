import { Module } from '@nestjs/common';
import { SuggestionService } from './suggestion.service';
import { SuggestionController } from './suggestion.controller';
import { SuggestionRepo } from '../../database/repos/suggestion/suggestion.repo';

@Module({
  controllers: [SuggestionController],
  providers: [SuggestionService, SuggestionRepo],
  exports: [SuggestionService, SuggestionRepo],
})
export class SuggestionModule {}
