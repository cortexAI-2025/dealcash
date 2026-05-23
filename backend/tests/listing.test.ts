import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/app';
import { prisma } from '../src/services/prisma.service';
import { config } from '../src/config';

jest.mock('../src/services/prisma.service', () => ({
  prisma: {
    listing: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    agentRule: {
      findMany: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  },
}));

jest.mock('../src/services/notification.service', () => ({
  notificationService: {
    notifyFlashDeal: jest.fn(),
    create: jest.fn(),
    getUnread: jest.fn(),
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const makeToken = (userId = 'user-1', role = 'USER') =>
  jwt.sign({ id: userId, email: 'test@example.com', role }, config.jwtSecret);

const mockListing = {
  id: 'listing-1',
  title: 'iPhone 14 Pro',
  description: 'Excellent condition, barely used',
  price: 800,
  urgency: 'HIGH',
  status: 'ACTIVE',
  category: 'Electronics',
  photos: [],
  latitude: 48.8566,
  longitude: 2.3522,
  address: '1 Rue de la Paix',
  city: 'Paris',
  expiresAt: new Date(Date.now() + 86400000),
  sellerId: 'seller-1',
  viewCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  seller: { id: 'seller-1', name: 'Alice', avatarUrl: null },
};

describe('Listings API', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('GET /api/listings', () => {
    it('should return paginated listings', async () => {
      (mockPrisma.listing.findMany as jest.Mock).mockResolvedValue([mockListing]);
      (mockPrisma.listing.count as jest.Mock).mockResolvedValue(1);

      const res = await request(app).get('/api/listings');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination).toBeDefined();
    });

    it('should filter by urgency', async () => {
      (mockPrisma.listing.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.listing.count as jest.Mock).mockResolvedValue(0);

      const res = await request(app).get('/api/listings?urgency=FLASH');

      expect(res.status).toBe(200);
      expect(mockPrisma.listing.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ urgency: 'FLASH' }),
        })
      );
    });
  });

  describe('GET /api/listings/:id', () => {
    it('should return listing details', async () => {
      (mockPrisma.listing.findUnique as jest.Mock).mockResolvedValue({
        ...mockListing,
        transaction: null,
      });
      (mockPrisma.listing.update as jest.Mock).mockResolvedValue(mockListing);

      const res = await request(app).get('/api/listings/listing-1');

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('listing-1');
    });

    it('should return 404 for unknown listing', async () => {
      (mockPrisma.listing.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app).get('/api/listings/unknown');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/listings', () => {
    it('should create listing when authenticated', async () => {
      (mockPrisma.listing.create as jest.Mock).mockResolvedValue({
        ...mockListing,
        sellerId: 'user-1',
      });
      (mockPrisma.agentRule.findMany as jest.Mock).mockResolvedValue([]);

      const res = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({
          title: 'iPhone 14 Pro',
          description: 'Excellent condition, barely used',
          price: 800,
          category: 'Electronics',
          urgency: 'HIGH',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app).post('/api/listings').send({
        title: 'Test',
        description: 'Test description for listing',
        price: 100,
        category: 'Other',
      });

      expect(res.status).toBe(401);
    });

    it('should validate price is positive', async () => {
      const res = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${makeToken()}`)
        .send({
          title: 'Test',
          description: 'Test description for listing',
          price: -10,
          category: 'Electronics',
        });

      expect(res.status).toBe(400);
    });
  });
});
