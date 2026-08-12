import { Injectable, NotFoundException } from '@nestjs/common';
import { SuggestionRepo, SuggestionModel } from '../../database/repos/suggestion/suggestion.repo';
import { CreateSuggestionDto } from './dto/create-suggestion.dto';
import { UpdateSuggestionDto } from './dto/update-suggestion.dto';

@Injectable()
export class SuggestionService {
  constructor(private readonly suggestionRepo: SuggestionRepo) {}

  async createSuggestion(
    userId: string,
    createDto: CreateSuggestionDto,
  ): Promise<SuggestionModel> {
    return this.suggestionRepo.create({
      pageId: createDto.pageId,
      creatorId: userId,
      originalText: createDto.originalText,
      suggestedText: createDto.suggestedText,
      startIndex: createDto.startIndex,
      endIndex: createDto.endIndex,
      status: 'PENDING',
    });
  }

  async getPageSuggestions(pageId: string): Promise<SuggestionModel[]> {
    return this.suggestionRepo.getPageSuggestions(pageId);
  }

  async updateSuggestion(
    id: string,
    updateDto: UpdateSuggestionDto,
  ): Promise<SuggestionModel> {
    const suggestion = await this.suggestionRepo.findById(id);
    if (!suggestion) {
      throw new NotFoundException('Suggestion not found');
    }

    return this.suggestionRepo.update(id, {
      status: updateDto.status,
    });
  }
}
