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

@UseGuards(JwtAuthGuard)
@Controller('suggestions')
export class SuggestionController {
  constructor(private readonly suggestionService: SuggestionService) {}

  @HttpCode(HttpStatus.OK)
  @Post('create')
  async create(
    @Body() createDto: CreateSuggestionDto,
    @AuthUser() user: User,
  ) {
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
  ) {
    return this.suggestionService.updateSuggestion(id, updateDto);
  }
}
