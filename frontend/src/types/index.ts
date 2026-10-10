export interface PackageCourse {
  title: string;
  count: number;
  options: string[];
}

export interface CateringPackage {
  packageId: string;
  name: string;
  perPersonPrice: number;
  minGuests: number;
  description: string;
  badge?: string;
  courses?: Record<string, PackageCourse>;
}

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  unitPrice: number;
  minQuantity?: number;
  description?: string;
  servesGuests?: number;
  isVegetarian?: boolean;
  isHalal?: boolean;
}

export interface EnterpriseCustomer {
  id: string;
  name: string;
  phoneNumber: string;
  postcode?: string;
}

export interface EnterpriseEvent {
  id: string;
  eventType: string;
  eventDate: string;
  servingTime?: string;
  guestCount: number;
  deliveryAddress?: string;
  dietaryPreference?: string;
  status: 'QUOTED' | 'CONFIRMED' | 'IN_PREP' | 'DISPATCHED' | 'COMPLETED' | 'CANCELLED';
}

export interface EnterpriseOrder {
  id: string;
  customerId: string;
  eventId?: string;
  orderMode: 'FEAST_PACKAGE' | 'A_LA_CARTE_TRAYS';
  selectedPackageId?: string;
  totalAmount: number;
  paymentStatus: 'PENDING' | 'PAID' | 'REFUNDED';
  itemsSummary?: string;
  confirmedAt?: string;
  createdAt: string;
  customer?: EnterpriseCustomer;
  event?: EnterpriseEvent;
}

export interface EnterpriseHandoff {
  id: string;
  phoneNumber: string;
  reason: string;
  status: 'PENDING' | 'RESOLVED';
  createdAt: string;
}

export interface EnterpriseMessage {
  id: string;
  phoneNumber: string;
  direction: 'INBOUND' | 'OUTBOUND';
  messageText: string;
  createdAt: string;
}

export interface DashboardStats {
  totalCustomers: number;
  totalEvents: number;
  totalOrders: number;
  totalRevenue: number;
  pendingHandoffs: number;
  totalHandoffs: number;
}

export interface QuoteCalculationResult {
  packageName?: string;
  perPersonRate?: number;
  guestCount?: number;
  feedsGuestCapacity?: number;
  itemsTotal: number;
  deliveryFee: number;
  totalAmount: number;
  costPerGuest?: number;
  deliveryZoneNote: string;
  summaryText: string;
  smartReceiptCard: string;
  items?: Array<{
    dishName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
}

export interface HostProtectionAudit {
  isSafe: boolean;
  trapType: 'NONE' | 'UNDER_ORDERING' | 'STEALTH_MEAT_EATER' | 'OVER_ORDERING' | 'SPICE_SENSITIVITY' | 'DIETARY_GAP';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  headline: string;
  adviceText: string;
  portionDeficitGuests?: number;
  recommendedTrayAdjustment?: string;
  formattedBubbleAdvice?: string;
}
