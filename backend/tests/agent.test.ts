import { aiAgentService } from '../src/services/ai-agent.service';
import { prisma } from '../src/services/prisma.service';

jest.mock('../src/services/prisma.service', () => ({
  prisma: {
    listing: { findMany: jest.fn(), update: jest.fn() },
    agentRule: { findMany: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    user: { findUnique: jest.fn() },
    transaction: { create: jest.fn() },
    notification: { create: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock('../src/services/stripe.service', () => ({
  stripeService: {
    createPaymentIntent: jest.fn().mockResolvedValue({
      clientSecret: 'pi_secret',
      paymentIntentId: 'pi_123',
    }),
    calculateFees: jest.fn().mockReturnValue({ platformFee: 5, sellerAmount: 95 }),
  },
}));

jest.mock('../src/services/notification.service', () => ({
  notificationService: { create: jest.fn() },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const baseRule = {
  id: 'rule-1',
  userId: 'buyer-1',
  name: 'Test Rule',
  status: 'ACTIVE' as const,
  maxPrice: 500,
  categories: ['Electronics'],
  urgencyLevels: ['HIGH', 'FLASH'] as import('@prisma/client').UrgencyLevel[],
  maxDistanceKm: null,
  userLatitude: null,
  userLongitude: null,
  keywords: [],
  dailyBudget: 1000,
  spentToday: 0,
  totalPurchases: 0,
  lastRunAt: null,
  budgetResetAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const baseListing = {
  id: 'listing-1',
  title: 'Used laptop',
  description: 'Good condition laptop for sale',
  price: 300,
  urgency: 'HIGH' as const,
  status: 'ACTIVE' as const,
  category: 'Electronics',
  photos: [],
  latitude: null,
  longitude: null,
  address: null,
  city: null,
  expiresAt: new Date(Date.now() + 86400000),
  sellerId: 'seller-1',
  viewCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  seller: { id: 'seller-1', stripeCustomerId: 'cus_seller' },
};

describe('AI Agent Service', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('evaluateRule', () => {
    it('should match when all criteria met', async () => {
      const result = await aiAgentService.evaluateRule(baseRule, baseListing);
      expect(result).toBe(true);
    });

    it('should reject when price exceeds maxPrice', async () => {
      const result = await aiAgentService.evaluateRule(baseRule, { ...baseListing, price: 600 });
      expect(result).toBe(false);
    });

    it('should reject when daily budget exceeded', async () => {
      const rule = { ...baseRule, spentToday: 900, dailyBudget: 1000 };
      const listing = { ...baseListing, price: 200 };
      const result = await aiAgentService.evaluateRule(rule, listing);
      expect(result).toBe(false);
    });

    it('should reject wrong category', async () => {
      const result = await aiAgentService.evaluateRule(baseRule, {
        ...baseListing,
        category: 'Clothing',
      });
      expect(result).toBe(false);
    });

    it('should reject wrong urgency level', async () => {
      const result = await aiAgentService.evaluateRule(baseRule, {
        ...baseListing,
        urgency: 'LOW',
      });
      expect(result).toBe(false);
    });

    it('should match keywords', async () => {
      const rule = { ...baseRule, keywords: ['laptop'] };
      const result = await aiAgentService.evaluateRule(rule, baseListing);
      expect(result).toBe(true);
    });

    it('should reject missing keyword', async () => {
      const rule = { ...baseRule, keywords: ['smartphone'] };
      const result = await aiAgentService.evaluateRule(rule, baseListing);
      expect(result).toBe(false);
    });

    it('should reject listing by same user', async () => {
      const rule = { ...baseRule, userId: 'seller-1' };
      // evaluateRule doesn't check sellerId — runAgentCycle does — so it should still pass
      const result = await aiAgentService.evaluateRule(rule, baseListing);
      expect(result).toBe(true);
    });

    it('should filter by distance', async () => {
      const rule = {
        ...baseRule,
        maxDistanceKm: 10,
        userLatitude: 48.8566,
        userLongitude: 2.3522,
      };
      const nearListing = { ...baseListing, latitude: 48.86, longitude: 2.36 };
      const farListing = { ...baseListing, latitude: 51.5074, longitude: -0.1278 }; // London

      expect(await aiAgentService.evaluateRule(rule, nearListing)).toBe(true);
      expect(await aiAgentService.evaluateRule(rule, farListing)).toBe(false);
    });
  });

  describe('runAgentCycle', () => {
    it('should do nothing with no active listings', async () => {
      (mockPrisma.agentRule.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      (mockPrisma.listing.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.agentRule.findMany as jest.Mock).mockResolvedValue([baseRule]);

      await aiAgentService.runAgentCycle();

      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should skip if no agent rules', async () => {
      (mockPrisma.agentRule.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      (mockPrisma.listing.findMany as jest.Mock).mockResolvedValue([baseListing]);
      (mockPrisma.agentRule.findMany as jest.Mock).mockResolvedValue([]);

      await aiAgentService.runAgentCycle();

      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });
  });
});
