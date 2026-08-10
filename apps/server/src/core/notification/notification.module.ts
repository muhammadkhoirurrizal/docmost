import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationProcessor } from './notification.processor';
import { CommentNotificationService } from './services/comment.notification';
import { PageNotificationService } from './services/page.notification';

import { PageUpdateEmailRateLimiter } from './services/page-update-email-rate-limiter';

import { WsModule } from '../../ws/ws.module';
import { BullModule } from '@nestjs/bullmq';
import { QueueName } from '../../integrations/queue/constants';

@Module({
  imports: [
    WsModule,
    BullModule.registerQueue({ name: QueueName.NOTIFICATION_QUEUE }),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationProcessor,
    CommentNotificationService,
    PageNotificationService,
    PageUpdateEmailRateLimiter,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
