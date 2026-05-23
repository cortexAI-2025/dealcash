import { Request } from 'express';
import { Role } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: Role;
  };
}

export interface JwtPayload {
  id: string;
  email: string;
  role: Role;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
}

export interface ListingFilters {
  urgency?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  lat?: string;
  lng?: string;
  radius?: string;
  search?: string;
  status?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AgentRuleInput {
  name: string;
  maxPrice: number;
  categories: string[];
  urgencyLevels: string[];
  maxDistanceKm?: number;
  userLatitude?: number;
  userLongitude?: number;
  keywords?: string[];
  dailyBudget: number;
}

export interface LocationData {
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
}

export interface NotificationPayload {
  userId: string;
  title: string;
  body: string;
  type: string;
  data?: Record<string, unknown>;
}
