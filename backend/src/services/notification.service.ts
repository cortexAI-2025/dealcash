import { prisma } from './prisma.service';
import { NotificationPayload } from '../types';
import { logger } from './logger.service';
import { wsService } from './websocket.service';

export const notificationService = {
  async create(payload: NotificationPayload): Promise<void> {
    const notification = await prisma.notification.create({
      data: {
        userId: payload.userId,
        title: payload.title,
        body: payload.body,
        type: payload.type,
        data: (payload.data || {}) as import('@prisma/client').Prisma.InputJsonValue,
      },
    });

    // Send real-time via WebSocket
    wsService.sendToUser(payload.userId, {
      type: 'notification',
      notification,
    });

    // In production: send push notification via FCM/APNs
    await this.sendPushNotification(payload);

    logger.debug(`Notification created for user ${payload.userId}: ${payload.title}`);
  },

  async sendPushNotification(payload: NotificationPayload): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { pushToken: true },
    });

    if (!user?.pushToken) return;

    // Expo push notifications (production integration point)
    logger.debug(`Push notification queued for token ${user.pushToken}`);
  },

  async getUnread(userId: string): Promise<object[]> {
    return prisma.notification.findMany({
      where: { userId, read: false },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  },

  async markRead(userId: string, notificationId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });
  },

  async markAllRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  },

  async notifyFlashDeal(listing: { id: string; title: string; price: number; sellerId: string }): Promise<void> {
    // Notify all users with matching agent rules
    const rules = await prisma.agentRule.findMany({
      where: { status: 'ACTIVE' },
      select: { userId: true },
    });

    const uniqueUserIds = [...new Set(rules.map(r => r.userId))].filter(
      id => id !== listing.sellerId
    );

    await Promise.all(
      uniqueUserIds.map(userId =>
        this.create({
          userId,
          title: '⚡ Flash Deal Available!',
          body: `${listing.title} — ${listing.price}€`,
          type: 'FLASH_DEAL',
          data: { listingId: listing.id },
        })
      )
    );
  },
};
