import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PageHistoryRepo } from '@docmost/db/repos/page/page-history.repo';
import { Page } from '@docmost/db/types/entity.types';
import { isDeepStrictEqual } from 'node:util';

import { normalizeTiptapJson } from '../collaboration.util';

export class UpdatedPageEvent {
  page: Page;
  forceHistory?: boolean;
}

@Injectable()
export class HistoryListener {
  private readonly logger = new Logger(HistoryListener.name);

  constructor(private readonly pageHistoryRepo: PageHistoryRepo) { }

  @OnEvent('collab.page.updated')
  async handleCreatePageHistory(event: UpdatedPageEvent) {
    const { page, forceHistory } = event;
    const lastHistory = await this.pageHistoryRepo.findPageLastHistory(page.id);

    const normalizedContent = normalizeTiptapJson(page.content);
    const lastNormalizedContent = lastHistory ? normalizeTiptapJson(lastHistory.content) : null;

    // If forceHistory is true, bypass all checks and create history immediately
    if (forceHistory && (!lastHistory || (normalizedContent && !isDeepStrictEqual(lastNormalizedContent, normalizedContent)))) {
      try {
        await this.pageHistoryRepo.saveHistory({
          ...page,
          content: normalizedContent,
        });
        this.logger.debug(`History created for: ${page.id} (force: ${!!forceHistory})`);
        return;
      } catch (err) {
        this.logger.error(`Failed to create history for page: ${page.id}`, err);
        return;
      }
    }

    // const pageCreationTime = new Date(page.createdAt).getTime();
    // const currentTime = Date.now();
    // const FIVE_MINUTES = 5 * 60 * 1000;

    // if (currentTime - pageCreationTime < FIVE_MINUTES) {
    //   return;
    // }

    // if (
    //   !lastHistory ||
    //   (!isDeepStrictEqual(lastNormalizedContent, normalizedContent) &&
    //     currentTime - new Date(lastHistory.createdAt).getTime() >= FIVE_MINUTES)
    // ) {
    //   try {
    //     await this.pageHistoryRepo.saveHistory({
    //       ...page,
    //       content: normalizedContent,
    //     });
    //     this.logger.debug(`New periodic history created for: ${page.id}`);
    //   } catch (err) {
    //     this.logger.error(`Failed to create periodic history for page: ${page.id}`, err);
    //   }
    // }
  }
}
