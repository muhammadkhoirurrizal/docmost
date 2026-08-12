import { Injectable, Logger } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import {
  ISuggestionNotificationJob,
  ISuggestionResolvedNotificationJob,
} from '../../../integrations/queue/constants/queue.interface';
import { NotificationService } from '../notification.service';
import { NotificationType } from '../notification.constants';
import { SpaceMemberRepo } from '@docmost/db/repos/space/space-member.repo';
import { WatcherRepo } from '@docmost/db/repos/watcher/watcher.repo';
import { getPageTitle } from '../../../common/helpers';
import { SuggestionRepo } from '@docmost/db/repos/suggestion/suggestion.repo';

@Injectable()
export class SuggestionNotificationService {
  private readonly logger = new Logger(SuggestionNotificationService.name);

  constructor(
    @InjectKysely() private readonly db: KyselyDB,
    private readonly notificationService: NotificationService,
    private readonly spaceMemberRepo: SpaceMemberRepo,
    private readonly watcherRepo: WatcherRepo,
  ) {}

  async processSuggestion(data: ISuggestionNotificationJob, appUrl: string) {
    const {
      suggestionId,
      pageId,
      spaceId,
      workspaceId,
      actorId,
    } = data;

    const context = await this.getSuggestionContext(actorId, pageId, spaceId, appUrl);
    if (!context) return;

    const { actor, pageTitle, pageUrl } = context;

    const watcherIds = await this.watcherRepo.getPageWatcherIds(pageId);
    
    // Also notify the page creator if not already a watcher
    const pageCreator = await this.db.selectFrom('pages').select('creatorId').where('id', '=', pageId).executeTakeFirst();
    const recipientIds = new Set<string>(watcherIds);
    if (pageCreator?.creatorId) {
      recipientIds.add(pageCreator.creatorId);
    }

    const usersWithSpaceAccess = await this.spaceMemberRepo.getUserIdsWithSpaceAccess(
      Array.from(recipientIds),
      spaceId,
    );
    const usersWithAccess = new Set(usersWithSpaceAccess);

    for (const recipientId of recipientIds) {
      if (recipientId === actorId) continue;
      if (!usersWithAccess.has(recipientId)) continue;

      await this.notificationService.create({
        userId: recipientId,
        workspaceId,
        type: NotificationType.SUGGESTION_CREATED,
        actorId,
        pageId,
        spaceId,
        data: { suggestionId },
      });

      // Email queuing can be added here later if needed
    }
  }

  async processResolved(data: ISuggestionResolvedNotificationJob, appUrl: string) {
    const {
      suggestionId,
      suggestionCreatorId,
      pageId,
      spaceId,
      workspaceId,
      actorId,
      status,
    } = data;

    if (suggestionCreatorId === actorId) return;

    const context = await this.getSuggestionContext(actorId, pageId, spaceId, appUrl);
    if (!context) return;

    const roles = await this.spaceMemberRepo.getUserSpaceRoles(
      suggestionCreatorId,
      spaceId,
    );

    if (!roles) return;

    await this.notificationService.create({
      userId: suggestionCreatorId,
      workspaceId,
      type: NotificationType.SUGGESTION_RESOLVED,
      actorId,
      pageId,
      spaceId,
      data: { suggestionId, status },
    });
  }

  private async getSuggestionContext(
    actorId: string,
    pageId: string,
    spaceId: string,
    appUrl: string,
  ) {
    const [actor, page, space] = await Promise.all([
      this.db
        .selectFrom('users')
        .select(['id', 'name'])
        .where('id', '=', actorId)
        .executeTakeFirst(),
      this.db
        .selectFrom('pages')
        .select(['id', 'title', 'slugId'])
        .where('id', '=', pageId)
        .executeTakeFirst(),
      this.db
        .selectFrom('spaces')
        .select(['id', 'slug'])
        .where('id', '=', spaceId)
        .executeTakeFirst(),
    ]);

    if (!actor || !page || !space) return null;

    const pageUrl = `${appUrl}/s/${space.slug}/p/${page.slugId}`;
    return { actor, pageTitle: getPageTitle(page.title), pageUrl };
  }
}
