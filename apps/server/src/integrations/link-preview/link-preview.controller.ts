import {
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { LinkPreviewService } from './link-preview.service';
import { LinkMetadataDto, LinkMetadataResponse } from './dto/link-metadata.dto';

@UseGuards(JwtAuthGuard)
@Controller('links')
export class LinkPreviewController {
  constructor(private readonly linkPreviewService: LinkPreviewService) {}

  @Post('metadata')
  async getMetadata(
    @Body() dto: LinkMetadataDto,
  ): Promise<LinkMetadataResponse> {
    return this.linkPreviewService.fetchMetadata(dto.url);
  }
}
