export type UrgencyLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'FLASH';
export type ListingStatus = 'DRAFT' | 'ACTIVE' | 'RESERVED' | 'SOLD' | 'EXPIRED' | 'CANCELLED';
export type TransactionStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
export type AgentStatus = 'ACTIVE' | 'PAUSED' | 'STOPPED';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatarUrl?: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  urgency: UrgencyLevel;
  status: ListingStatus;
  photos: string[];
  category: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  expiresAt: string;
  viewCount: number;
  sellerId: string;
  seller: Pick<User, 'id' | 'name' | 'avatarUrl'>;
  createdAt: string;
}

export interface Transaction {
  id: string;
  listingId: string;
  listing: Listing;
  buyerId: string;
  sellerId: string;
  amount: number;
  platformFee: number;
  sellerAmount: number;
  status: TransactionStatus;
  isAgentPurchase: boolean;
  completedAt?: string;
  createdAt: string;
}

export interface AgentRule {
  id: string;
  userId: string;
  name: string;
  status: AgentStatus;
  maxPrice: number;
  categories: string[];
  urgencyLevels: UrgencyLevel[];
  maxDistanceKm?: number;
  userLatitude?: number;
  userLongitude?: number;
  keywords: string[];
  dailyBudget: number;
  spentToday: number;
  totalPurchases: number;
  createdAt: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

export interface DashboardStats {
  listings: { total: number; active: number; sold: number };
  sales: { count: number; revenue: number };
  purchases: { count: number; spent: number };
  agentRules: AgentRule[];
  recentTransactions: Transaction[];
}

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  ListingDetail: { listingId: string };
  CreateListing: undefined;
  Payment: { listingId: string };
  AgentRuleForm: { ruleId?: string };
};

export type MainTabParamList = {
  Listings: undefined;
  Dashboard: undefined;
  Agent: undefined;
  Profile: undefined;
};
