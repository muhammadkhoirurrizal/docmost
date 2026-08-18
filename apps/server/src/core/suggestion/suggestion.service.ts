import { Injectable, NotFoundException } from '@nestjs/common';
import { SuggestionRepo, SuggestionModel } from '../../database/repos/suggestion/suggestion.repo';
import { CreateSuggestionDto } from './dto/create-suggestion.dto';
import { UpdateSuggestionDto, SuggestionStatus } from './dto/update-suggestion.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueJob, QueueName } from '../../integrations/queue/constants';
import { PageRepo } from '@docmost/db/repos/page/page.repo';

@Injectable()
export class SuggestionService {
  constructor(
    private readonly suggestionRepo: SuggestionRepo,
    private readonly pageRepo: PageRepo,
    @InjectQueue(QueueName.NOTIFICATION_QUEUE)
    private readonly notificationQueue: Queue,
  ) {}

  async createSuggestion(
    userId: string,
    createDto: CreateSuggestionDto,
  ): Promise<SuggestionModel> {
    const result = await this.suggestionRepo.create({
      pageId: createDto.pageId,
      creatorId: userId,
      originalText: createDto.originalText,
      suggestedText: createDto.suggestedText,
      startIndex: createDto.startIndex,
      endIndex: createDto.endIndex,
      status: SuggestionStatus.PENDING,
    });

    const page = await this.pageRepo.findById(createDto.pageId);
    if (page) {
      await this.notificationQueue.add(QueueJob.SUGGESTION_NOTIFICATION, {
        suggestionId: result.id,
        pageId: page.id,
        spaceId: page.spaceId,
        workspaceId: page.workspaceId,
        actorId: userId,
      });
    }

    return result;
  }

  async getPageSuggestions(pageId: string): Promise<SuggestionModel[]> {
    return this.suggestionRepo.getPageSuggestions(pageId);
  }

  async getSuggestionById(id: string): Promise<SuggestionModel | undefined> {
    return this.suggestionRepo.findById(id);
  }

  async updateSuggestion(
    id: string,
    userId: string,
    updateDto: UpdateSuggestionDto,
  ): Promise<SuggestionModel> {
    const suggestion = await this.suggestionRepo.findById(id);
    if (!suggestion) {
      throw new NotFoundException('Suggestion not found');
    }

    const result = await this.suggestionRepo.update(id, {
      status: updateDto.status,
    });

    const page = await this.pageRepo.findById(suggestion.pageId);
    if (page) {
      await this.notificationQueue.add(QueueJob.SUGGESTION_RESOLVED_NOTIFICATION, {
        suggestionId: result.id,
        suggestionCreatorId: suggestion.creatorId,
        pageId: page.id,
        spaceId: page.spaceId,
        workspaceId: page.workspaceId,
        actorId: userId,
        status: updateDto.status,
      });
    }

    return result;
  }

  async deleteSuggestion(id: string): Promise<void> {
    const suggestion = await this.suggestionRepo.findById(id);
    if (!suggestion) {
      throw new NotFoundException('Suggestion not found');
    }
    await this.suggestionRepo.delete(id);
  }
}
