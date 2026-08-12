import { Logger, OnModuleDestroy } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { QueueJob, QueueName } from '../../integrations/queue/constants';
import {
  IApprovalRejectedNotificationJob,
  IApprovalRequestedNotificationJob,
  ICommentNotificationJob,
  ICommentResolvedNotificationJob,
  IPageMentionNotificationJob,
  IPageUpdateNotificationJob,
  IPermissionGrantedNotificationJob,
  ISuggestionNotificationJob,
  ISuggestionResolvedNotificationJob,
} from '../../integrations/queue/constants/queue.interface';
import { CommentNotificationService } from './services/comment.notification';
import { PageNotificationService } from './services/page.notification';
import { SuggestionNotificationService } from './services/suggestion.notification';
import { DomainService } from '../../integrations/environment/domain.service';

@Processor(QueueName.NOTIFICATION_QUEUE)
export class NotificationProcessor
  extends WorkerHost
  implements OnModuleDestroy
{
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly commentNotificationService: CommentNotificationService,
    private readonly pageNotificationService: PageNotificationService,
    private readonly suggestionNotificationService: SuggestionNotificationService,
    private readonly domainService: DomainService,
    private readonly moduleRef: ModuleRef,
    @InjectKysely() private readonly db: KyselyDB,
  ) {
    super();
  }

  async process(
    job: Job<
      | ICommentNotificationJob
      | ICommentResolvedNotificationJob
      | IPageMentionNotificationJob
      | IPageUpdateNotificationJob
      | IPermissionGrantedNotificationJob
      | ISuggestionNotificationJob
      | ISuggestionResolvedNotificationJob,
      void
    >,
  ): Promise<void> {
    try {

      const workspaceId = await this.resolveWorkspaceId(job);
      const appUrl = await this.getWorkspaceUrl(workspaceId);

      switch (job.name) {
        case QueueJob.COMMENT_NOTIFICATION: {
          await this.commentNotificationService.processComment(
            job.data as ICommentNotificationJob,
            appUrl,
          );
          break;
        }

        case QueueJob.SUGGESTION_NOTIFICATION: {
          await this.suggestionNotificationService.processSuggestion(
            job.data as ISuggestionNotificationJob,
            appUrl,
          );
          break;
        }

        case QueueJob.SUGGESTION_RESOLVED_NOTIFICATION: {
          await this.suggestionNotificationService.processResolved(
            job.data as ISuggestionResolvedNotificationJob,
            appUrl,
          );
          break;
        }

        case QueueJob.COMMENT_RESOLVED_NOTIFICATION: {
          await this.commentNotificationService.processResolved(
            job.data as ICommentResolvedNotificationJob,
            appUrl,
          );
          break;
        }

        case QueueJob.PAGE_MENTION_NOTIFICATION: {
          await this.pageNotificationService.processPageMention(
            job.data as IPageMentionNotificationJob,
            appUrl,
          );
          break;
        }

        case QueueJob.PAGE_PERMISSION_GRANTED: {
          await this.pageNotificationService.processPermissionGranted(
            job.data as IPermissionGrantedNotificationJob,
            appUrl,
          );
          break;
        }

        case QueueJob.PAGE_UPDATED: {
          await this.pageNotificationService.processPageUpdate(
            job.data as IPageUpdateNotificationJob,
            appUrl,
          );
          break;
        }

        case QueueJob.PAGE_UPDATE_DIGEST: {
          const { userId } = job.data as unknown as { userId: string };
          await this.pageNotificationService.processDigest(userId, appUrl);
          break;
        }

        default:
          this.logger.warn(`Unknown notification job: ${job.name}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Failed to process ${job.name}: ${message}`);
      throw err;
    }
  }

  private async resolveWorkspaceId(job: Job): Promise<string> {
    return (job.data as { workspaceId: string }).workspaceId;
  }


  private async getWorkspaceUrl(workspaceId: string): Promise<string> {
    const workspace = await this.db
      .selectFrom('workspaces')
      .select('hostname')
      .where('id', '=', workspaceId)
      .executeTakeFirst();

    return this.domainService.getUrl(workspace?.hostname);
  }

  @OnWorkerEvent('failed')
  onError(job: Job) {
    this.logger.error(
      `Error processing ${job.name} job. Reason: ${job.failedReason}`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
  }
}
