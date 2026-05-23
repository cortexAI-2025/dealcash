import { Response, NextFunction } from 'express';
import { prisma } from '../services/prisma.service';
import { notificationService } from '../services/notification.service';
import { createError } from '../middleware/error.middleware';
import { AuthenticatedRequest, ListingFilters, PaginationQuery } from '../types';
import { config } from '../config';

function buildListingWhere(filters: ListingFilters) {
  const where: Record<string, unknown> = { status: 'ACTIVE', expiresAt: { gt: new Date() } };

  if (filters.urgency) where['urgency'] = filters.urgency;
  if (filters.category) where['category'] = filters.category;
  if (filters.status) where['status'] = filters.status;

  if (filters.minPrice || filters.maxPrice) {
    where['price'] = {};
    if (filters.minPrice) (where['price'] as Record<string, number>)['gte'] = parseFloat(filters.minPrice);
    if (filters.maxPrice) (where['price'] as Record<string, number>)['lte'] = parseFloat(filters.maxPrice);
  }

  if (filters.search) {
    where['OR'] = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  return where;
}

export const listingController = {
  async getListings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page = '1', limit = String(config.pagination.defaultLimit) } = req.query as PaginationQuery;
      const filters = req.query as ListingFilters;

      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(parseInt(limit), config.pagination.maxLimit);
      const skip = (pageNum - 1) * limitNum;

      const where = buildListingWhere(filters);

      let orderBy: object = { createdAt: 'desc' };
      if (filters.urgency) {
        orderBy = [{ urgency: 'desc' }, { createdAt: 'desc' }];
      }

      const [listings, total] = await Promise.all([
        prisma.listing.findMany({
          where,
          include: {
            seller: { select: { id: true, name: true, avatarUrl: true } },
          },
          orderBy,
          skip,
          take: limitNum,
        }),
        prisma.listing.count({ where }),
      ]);

      // Apply geo filter in-memory if needed
      let filtered = listings;
      if (filters.lat && filters.lng && filters.radius) {
        const lat = parseFloat(filters.lat);
        const lng = parseFloat(filters.lng);
        const radius = parseFloat(filters.radius);
        filtered = listings.filter((l) => {
          if (!l.latitude || !l.longitude) return true;
          const d = haversineDistance(lat, lng, l.latitude, l.longitude);
          return d <= radius;
        });
      }

      res.json({
        success: true,
        data: filtered,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async getListing(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const listing = await prisma.listing.findUnique({
        where: { id: req.params.id },
        include: {
          seller: { select: { id: true, name: true, avatarUrl: true, phone: true } },
          transaction: { select: { status: true, createdAt: true } },
        },
      });

      if (!listing) return next(createError('Listing not found', 404));

      // Increment view count
      await prisma.listing.update({
        where: { id: listing.id },
        data: { viewCount: { increment: 1 } },
      });

      res.json({ success: true, data: listing });
    } catch (err) {
      next(err);
    }
  },

  async createListing(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        title, description, price, urgency, category,
        photos, latitude, longitude, address, city, expiresAt,
      } = req.body;

      const listing = await prisma.listing.create({
        data: {
          title,
          description,
          price: parseFloat(price),
          urgency: urgency || 'LOW',
          category,
          photos: photos || [],
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          address,
          city,
          expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          sellerId: req.user!.id,
        },
        include: {
          seller: { select: { id: true, name: true, avatarUrl: true } },
        },
      });

      // Notify agents if flash deal
      if (listing.urgency === 'FLASH' || listing.urgency === 'HIGH') {
        await notificationService.notifyFlashDeal(listing);
      }

      res.status(201).json({ success: true, data: listing });
    } catch (err) {
      next(err);
    }
  },

  async updateListing(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const listing = await prisma.listing.findUnique({ where: { id: req.params.id } });
      if (!listing) return next(createError('Listing not found', 404));
      if (listing.sellerId !== req.user!.id && req.user!.role !== 'ADMIN') {
        return next(createError('Not authorized', 403));
      }
      if (listing.status === 'SOLD') return next(createError('Cannot edit a sold listing', 400));

      const updated = await prisma.listing.update({
        where: { id: listing.id },
        data: req.body,
        include: { seller: { select: { id: true, name: true, avatarUrl: true } } },
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  },

  async deleteListing(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const listing = await prisma.listing.findUnique({ where: { id: req.params.id } });
      if (!listing) return next(createError('Listing not found', 404));
      if (listing.sellerId !== req.user!.id && req.user!.role !== 'ADMIN') {
        return next(createError('Not authorized', 403));
      }

      await prisma.listing.update({
        where: { id: listing.id },
        data: { status: 'CANCELLED' },
      });

      res.json({ success: true, message: 'Listing cancelled' });
    } catch (err) {
      next(err);
    }
  },

  async getMyListings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const listings = await prisma.listing.findMany({
        where: { sellerId: req.user!.id },
        include: { transaction: { select: { status: true } } },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ success: true, data: listings });
    } catch (err) {
      next(err);
    }
  },
};

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
