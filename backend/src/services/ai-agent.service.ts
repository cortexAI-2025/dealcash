import { AgentRule, Listing, UrgencyLevel } from '@prisma/client';
import { prisma } from './prisma.service';
import { stripeService } from './stripe.service';
import { notificationService } from './notification.service';
import { logger } from './logger.service';

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const aiAgentService = {
  async runAgentCycle(): Promise<void> {
    logger.info('AI Agent cycle starting...');

    // Reset daily budgets if needed
    await this.resetExpiredBudgets();

    const activeListings = await prisma.listing.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { gt: new Date() },
        transaction: null,
      },
      include: { seller: { select: { id: true, stripeCustomerId: true } } },
    });

    if (activeListings.length === 0) {
      logger.debug('No active listings for agent cycle');
      return;
    }

    const activeRules = await prisma.agentRule.findMany({
      where: { status: 'ACTIVE' },
      include: { user: { select: { id: true, email: true, stripeCustomerId: true } } },
    });

    logger.info(`Running ${activeRules.length} agent rules against ${activeListings.length} listings`);

    for (const rule of activeRules) {
      for (const listing of activeListings) {
        if (listing.sellerId === rule.userId) continue;

        const matches = await this.evaluateRule(rule, listing);
        if (matches) {
          await this.executeAgentPurchase(rule, listing);
          break; // one purchase per rule per cycle
        }
      }
    }
  },

  async evaluateRule(rule: AgentRule, listing: Listing): Promise<boolean> {
    // Price check
    if (listing.price > rule.maxPrice) return false;

    // Budget check
    if (rule.spentToday + listing.price > rule.dailyBudget) return false;

    // Category check
    if (rule.categories.length > 0 && !rule.categories.includes(listing.category)) return false;

    // Urgency check
    const urgencyLevels = rule.urgencyLevels as UrgencyLevel[];
    if (urgencyLevels.length > 0 && !urgencyLevels.includes(listing.urgency)) return false;

    // Distance check
    if (
      rule.maxDistanceKm &&
      rule.userLatitude &&
      rule.userLongitude &&
      listing.latitude &&
      listing.longitude
    ) {
      const distance = haversineDistance(
        rule.userLatitude,
        rule.userLongitude,
        listing.latitude,
        listing.longitude
      );
      if (distance > rule.maxDistanceKm) return false;
    }

    // Keyword check
    if (rule.keywords.length > 0) {
      const text = `${listing.title} ${listing.description}`.toLowerCase();
      const hasKeyword = rule.keywords.some((kw) => text.includes(kw.toLowerCase()));
      if (!hasKeyword) return false;
    }

    return true;
  },

  async executeAgentPurchase(rule: AgentRule, listing: Listing & { seller: { id: string; stripeCustomerId: string | null } }): Promise<void> {
    logger.info(`Agent rule ${rule.id} matched listing ${listing.id} — executing purchase`);

    const buyer = await prisma.user.findUnique({ where: { id: rule.userId } });
    if (!buyer?.stripeCustomerId) {
      logger.warn(`Agent rule ${rule.id}: buyer has no Stripe customer ID`);
      return;
    }

    const { platformFee, sellerAmount } = stripeService.calculateFees(listing.price);

    try {
      const { paymentIntentId } = await stripeService.createPaymentIntent(
        listing.price,
        'eur',
        buyer.stripeCustomerId,
        {
          listingId: listing.id,
          agentRuleId: rule.id,
          isAgentPurchase: 'true',
        }
      );

      await prisma.$transaction(async (tx) => {
        await tx.listing.update({ where: { id: listing.id }, data: { status: 'RESERVED' } });

        await tx.transaction.create({
          data: {
            listingId: listing.id,
            buyerId: rule.userId,
            sellerId: listing.sellerId,
            amount: listing.price,
            platformFee,
            sellerAmount,
            status: 'PROCESSING',
            stripePaymentIntentId: paymentIntentId,
            agentRuleId: rule.id,
            isAgentPurchase: true,
          },
        });

        await tx.agentRule.update({
          where: { id: rule.id },
          data: {
            spentToday: { increment: listing.price },
            totalPurchases: { increment: 1 },
            lastRunAt: new Date(),
          },
        });
      });

      // Notify buyer and seller
      await Promise.all([
        notificationService.create({
          userId: rule.userId,
          title: '🤖 Agent Purchase Initiated',
          body: `Your AI agent purchased: ${listing.title} for ${listing.price}€`,
          type: 'AGENT_PURCHASE',
          data: { listingId: listing.id },
        }),
        notificationService.create({
          userId: listing.sellerId,
          title: '🎉 Your item was purchased!',
          body: `${listing.title} was purchased by an AI agent`,
          type: 'SALE',
          data: { listingId: listing.id },
        }),
      ]);

      logger.info(`Agent purchase completed: listing ${listing.id}`);
    } catch (err) {
      logger.error(`Agent purchase failed for listing ${listing.id}:`, err);
    }
  },

  async resetExpiredBudgets(): Promise<void> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await prisma.agentRule.updateMany({
      where: { budgetResetAt: { lt: yesterday } },
      data: { spentToday: 0, budgetResetAt: new Date() },
    });
  },
};
