import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Patch,
  Param,
  Get,
} from '@nestjs/common';
import { SuggestionService } from './suggestion.service';
import { CreateSuggestionDto } from './dto/create-suggestion.dto';
import { UpdateSuggestionDto } from './dto/update-suggestion.dto';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User } from '@docmost/db/types/entity.types';
import SpaceAbilityFactory from '../casl/abilities/space-ability.factory';
import { SpaceCaslAction, SpaceCaslSubject } from '../casl/interfaces/space-ability.type';
import { PageRepo } from '@docmost/db/repos/page/page.repo';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

@UseGuards(JwtAuthGuard)
@Controller('suggestions')
export class SuggestionController {
  constructor(
    private readonly suggestionService: SuggestionService,
    private readonly spaceAbility: SpaceAbilityFactory,
    private readonly pageRepo: PageRepo,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post('create')
  async create(
    @Body() createDto: CreateSuggestionDto,
    @AuthUser() user: User,
  ) {
    const page = await this.pageRepo.findById(createDto.pageId);
    if (!page) throw new NotFoundException('Page not found');

    const ability = await this.spaceAbility.createForUser(user, page.spaceId);
    if (ability.cannot(SpaceCaslAction.Create, SpaceCaslSubject.Comment)) {
      throw new ForbiddenException();
    }

    return this.suggestionService.createSuggestion(user.id, createDto);
  }

  @HttpCode(HttpStatus.OK)
  @Get('page/:pageId')
  async getPageSuggestions(@Param('pageId') pageId: string) {
    return this.suggestionService.getPageSuggestions(pageId);
  }

  @HttpCode(HttpStatus.OK)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateSuggestionDto,
    @AuthUser() user: User,
  ) {
    const suggestion = await this.suggestionService.getSuggestionById(id);
    if (!suggestion) throw new NotFoundException('Suggestion not found');
    
    const page = await this.pageRepo.findById(suggestion.pageId);
    if (!page) throw new NotFoundException('Page not found');

    const ability = await this.spaceAbility.createForUser(user, page.spaceId);
    if (ability.cannot(SpaceCaslAction.Edit, SpaceCaslSubject.Page)) {
      throw new ForbiddenException();
    }

    return this.suggestionService.updateSuggestion(id, user.id, updateDto);
  }
}
