import { Response, NextFunction } from 'express';
import { prisma } from '../services/prisma.service';
import { notificationService } from '../services/notification.service';
import { AuthenticatedRequest } from '../types';

export const dashboardController = {
  async getStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;

      const [
        totalListings,
        activeListings,
        soldListings,
        totalSales,
        totalPurchases,
        agentRules,
        recentTransactions,
      ] = await Promise.all([
        prisma.listing.count({ where: { sellerId: userId } }),
        prisma.listing.count({ where: { sellerId: userId, status: 'ACTIVE' } }),
        prisma.listing.count({ where: { sellerId: userId, status: 'SOLD' } }),
        prisma.transaction.aggregate({
          where: { sellerId: userId, status: 'COMPLETED' },
          _sum: { sellerAmount: true },
          _count: true,
        }),
        prisma.transaction.aggregate({
          where: { buyerId: userId, status: 'COMPLETED' },
          _sum: { amount: true },
          _count: true,
        }),
        prisma.agentRule.findMany({
          where: { userId },
          select: { id: true, name: true, status: true, totalPurchases: true, spentToday: true, dailyBudget: true },
        }),
        prisma.transaction.findMany({
          where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
          include: { listing: { select: { title: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
      ]);

      res.json({
        success: true,
        data: {
          listings: { total: totalListings, active: activeListings, sold: soldListings },
          sales: { count: totalSales._count, revenue: totalSales._sum.sellerAmount || 0 },
          purchases: { count: totalPurchases._count, spent: totalPurchases._sum.amount || 0 },
          agentRules,
          recentTransactions,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async getNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const notifications = await notificationService.getUnread(req.user!.id);
      res.json({ success: true, data: notifications });
    } catch (err) {
      next(err);
    }
  },

  async markNotificationRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await notificationService.markRead(req.user!.id, req.params.id);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },

  async markAllNotificationsRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await notificationService.markAllRead(req.user!.id);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
};
