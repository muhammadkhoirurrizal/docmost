import { BadRequestException, Injectable } from '@nestjs/common';
import { load } from 'cheerio';
import { getEmbedUrlAndProvider } from '@docmost/editor-ext';
import { LinkMetadataResponse } from './dto/link-metadata.dto';

@Injectable()
export class LinkPreviewService {
  async fetchMetadata(url: string): Promise<LinkMetadataResponse> {
    // Only allow embeddable URLs
    const embedResult = getEmbedUrlAndProvider(url);
    if (embedResult.provider === 'iframe') {
      throw new BadRequestException('Unsupported URL for embed preview');
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Docmost/1.0 Link Preview Bot',
        },
        signal: controller.signal,
        redirect: 'follow',
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        throw new BadRequestException('URL does not return HTML content');
      }

      const html = await response.text();
      const $ = load(html);

      const title =
        $('meta[property="og:title"]').attr('content') ||
        $('meta[name="twitter:title"]').attr('content') ||
        $('title').text() ||
        null;

      const icon =
        $('meta[property="og:image"]').attr('content') ||
        $('meta[name="twitter:image"]').attr('content') ||
        null;

      return {
        url,
        title: title ? title.trim() : null,
        icon: icon ? icon.trim() : null,
        provider: embedResult.provider,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Return fallback metadata on fetch error
      return {
        url,
        title: null,
        icon: null,
        provider: embedResult.provider,
      };
    }
  }
}
