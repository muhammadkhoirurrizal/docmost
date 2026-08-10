import { Injectable, Logger } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { NotificationRepo } from '@docmost/db/repos/notification/notification.repo';
import { InsertableNotification } from '@docmost/db/types/entity.types';
import { PaginationOptions } from '@docmost/db/pagination/pagination-options';
import { WsGateway } from '../../ws/ws.gateway';
import { MailService } from '../../integrations/mail/mail.service';
import { NotificationTab, NotificationType, NotificationTypeToSettingKey } from './notification.constants';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly notificationRepo: NotificationRepo,
    private readonly wsGateway: WsGateway,
    private readonly mailService: MailService,
    @InjectKysely() private readonly db: KyselyDB,
  ) {}

  async create(data: InsertableNotification) {
    const user = await this.db
      .selectFrom('users')
      .select(['id'])
      .where('id', '=', data.userId)
      .where('deletedAt', 'is', null)
      .where('deactivatedAt', 'is', null)
      .executeTakeFirst();

    if (!user) return null;

    const notification = await this.notificationRepo.insert(data);

    this.wsGateway.server
      .to(`user-${data.userId}`)
      .emit('notification', { id: notification.id, type: notification.type });

    return notification;
  }

  async findByUserId(
    userId: string,
    pagination: PaginationOptions,
    type: NotificationTab = 'all',
  ) {
    const result = await this.notificationRepo.findByUserId(
      userId,
      pagination,
      type,
    );

    const pageIds = result.items
      .map((n: any) => n.pageId)
      .filter(Boolean);

    if (pageIds.length > 0) {
      const allPages = await this.db
        .selectFrom('pages')
        .select(['id', 'spaceId'])
        .where('id', 'in', pageIds)
        .execute();
      
      const spaceIds = [...new Set(allPages.map(p => p.spaceId))];
      const accessibleSpaceIds = new Set<string>();
      
      for (const spaceId of spaceIds) {
        const users = await this.db.selectFrom('spaceMembers').select('userId').where('userId', '=', userId).where('spaceId', '=', spaceId).unionAll(
          this.db.selectFrom('spaceMembers').innerJoin('groupUsers', 'groupUsers.groupId', 'spaceMembers.groupId').select('groupUsers.userId').where('groupUsers.userId', '=', userId).where('spaceMembers.spaceId', '=', spaceId)
        ).execute();
        
        if (users.length > 0) accessibleSpaceIds.add(spaceId);
      }

      const accessiblePageIds = new Set(
        allPages.filter(p => accessibleSpaceIds.has(p.spaceId)).map(p => p.id)
      );

      result.items = result.items.filter(
        (n: any) => !n.pageId || accessiblePageIds.has(n.pageId),
      );
    }

    return result;
  }

  async getUnreadCount(userId: string) {
    return this.notificationRepo.getUnreadCount(userId);
  }

  async markAsRead(notificationId: string, userId: string) {
    return this.notificationRepo.markAsRead(notificationId, userId);
  }

  async markMultipleAsRead(notificationIds: string[], userId: string) {
    return this.notificationRepo.markMultipleAsRead(notificationIds, userId);
  }

  async markAllAsRead(userId: string) {
    return this.notificationRepo.markAllAsRead(userId);
  }

  async queueEmail(
    userId: string,
    notificationId: string,
    subject: string,
    template: any,
    type?: NotificationType,
  ) {
    try {
      const user = await this.db
        .selectFrom('users')
        .select(['email', 'settings'])
        .where('id', '=', userId)
        .where('deletedAt', 'is', null)
        .where('deactivatedAt', 'is', null)
        .executeTakeFirst();

      if (!user?.email) return;

      if (type) {
        const settingKey = NotificationTypeToSettingKey[type];
        if (settingKey) {
          const settings = user.settings as any;
          if (settings?.notifications?.[settingKey] === false) return;
        }
      }

      await this.mailService.sendToQueue({
        to: user.email,
        subject,
        template,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(
        `Failed to queue email for notification ${notificationId}: ${message}`,
      );
    }
  }
}
