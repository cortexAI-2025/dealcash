import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/services/prisma.service';

jest.mock('../src/services/prisma.service', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  },
}));

jest.mock('../src/services/stripe.service', () => ({
  stripeService: {
    createCustomer: jest.fn().mockResolvedValue('cus_test123'),
    calculateFees: jest.fn().mockReturnValue({ platformFee: 5, sellerAmount: 95 }),
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Auth API', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
        createdAt: new Date(),
      });

      const res = await request(app).post('/api/auth/register').send({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe('test@example.com');
    });

    it('should reject duplicate email', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'existing' });

      const res = await request(app).post('/api/auth/register').send({
        email: 'existing@example.com',
        password: 'password123',
        name: 'Existing User',
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should reject weak password', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'test@example.com',
        password: 'short',
        name: 'Test User',
      });

      expect(res.status).toBe(400);
    });

    it('should reject invalid email', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'not-an-email',
        password: 'password123',
        name: 'Test User',
      });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should reject non-existent user', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app).post('/api/auth/login').send({
        email: 'ghost@example.com',
        password: 'password123',
      });

      expect(res.status).toBe(401);
    });

    it('should reject missing credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
      });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });
});
