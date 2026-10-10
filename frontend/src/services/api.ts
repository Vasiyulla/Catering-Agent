import {
  CateringPackage,
  MenuItem,
  EnterpriseOrder,
  EnterpriseHandoff,
  EnterpriseMessage,
  DashboardStats,
  QuoteCalculationResult,
  HostProtectionAudit,
} from '../types/index.ts';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

const DEFAULT_ORDERS: EnterpriseOrder[] = [
  {
    id: 'ORD-ROYAL-101',
    customerId: 'CUS-101',
    orderMode: 'FEAST_PACKAGE',
    selectedPackageId: 'PKG-GOLD',
    totalAmount: 1440.0,
    paymentStatus: 'PAID',
    itemsSummary: 'Dil Se Royal Celebration Feast (80 Covers)',
    createdAt: new Date().toISOString(),
    customer: {
      id: 'CUS-101',
      name: 'Priya & Vikram Sharma',
      phoneNumber: '+44 7123 456789',
      postcode: 'HA9 9AA (Wembley)',
    },
    event: {
      id: 'EVT-101',
      eventType: 'Royal Shaadi Reception',
      eventDate: '2026-10-11',
      servingTime: '13:30 BST',
      guestCount: 80,
      deliveryAddress: 'Wembley Grand Banqueting Hall, HA9',
      dietaryPreference: 'Mixed 60/40 (Halal Meat + Veg Cushion)',
      status: 'CONFIRMED',
    },
  },
  {
    id: 'ORD-TRAY-202',
    customerId: 'CUS-202',
    orderMode: 'A_LA_CARTE_TRAYS',
    totalAmount: 485.0,
    paymentStatus: 'PENDING',
    itemsSummary: '3x Awadhi Biryani Trays, 2x Butter Chicken, 2x Shahi Paneer',
    createdAt: new Date().toISOString(),
    customer: {
      id: 'CUS-202',
      name: 'Rajesh & Suman Patel',
      phoneNumber: '+44 7987 654321',
      postcode: 'SL1 2DX (Slough)',
    },
    event: {
      id: 'EVT-202',
      eventType: 'Home Puja & Gathering',
      eventDate: '2026-10-10',
      servingTime: '18:30 BST',
      guestCount: 40,
      deliveryAddress: 'Upton Court Road, Slough SL1',
      dietaryPreference: 'Strict Pure Vegetarian (Jain prep)',
      status: 'QUOTED',
    },
  },
  {
    id: 'ORD-ROYAL-303',
    customerId: 'CUS-303',
    orderMode: 'FEAST_PACKAGE',
    selectedPackageId: 'PKG-SILVER',
    totalAmount: 1160.0,
    paymentStatus: 'PAID',
    itemsSummary: 'Dil Se Classic Feast (60 Covers)',
    createdAt: new Date().toISOString(),
    customer: {
      id: 'CUS-303',
      name: 'Ayesha & Tariq Khan',
      phoneNumber: '+44 7555 123456',
      postcode: 'UB1 3HE (Southall)',
    },
    event: {
      id: 'EVT-303',
      eventType: 'Walima Banquet Gathering',
      eventDate: '2026-10-11',
      servingTime: '19:00 BST',
      guestCount: 60,
      deliveryAddress: 'The Broadway Banquet Suite, UB1',
      dietaryPreference: '100% British Halal Certified',
      status: 'IN_PREP',
    },
  },
  {
    id: 'ORD-ROYAL-404',
    customerId: 'CUS-404',
    orderMode: 'FEAST_PACKAGE',
    selectedPackageId: 'PKG-GOLD',
    totalAmount: 2880.0,
    paymentStatus: 'PAID',
    itemsSummary: 'Dil Se Royal Celebration Feast (160 Covers)',
    createdAt: new Date().toISOString(),
    customer: {
      id: 'CUS-404',
      name: 'Arjun & Meera Singhania',
      phoneNumber: '+44 7888 999000',
      postcode: 'TW7 4NP (Isleworth)',
    },
    event: {
      id: 'EVT-404',
      eventType: 'Corporate Diwali Gala',
      eventDate: '2026-10-10',
      servingTime: '19:30 BST',
      guestCount: 160,
      deliveryAddress: 'Osterley Park Pavilion, TW7',
      dietaryPreference: 'Mixed 60/40 (Halal Meat + Veg Cushion)',
      status: 'DISPATCHED',
    },
  },
  {
    id: 'ORD-ROYAL-505',
    customerId: 'CUS-505',
    orderMode: 'FEAST_PACKAGE',
    selectedPackageId: 'PKG-GOLD',
    totalAmount: 3600.0,
    paymentStatus: 'PAID',
    itemsSummary: 'Dil Se Grand Banquet (200 Covers)',
    createdAt: new Date().toISOString(),
    customer: {
      id: 'CUS-505',
      name: 'Lord & Lady Mountjoy / Gupta Corp',
      phoneNumber: '+44 7444 332211',
      postcode: 'W1K 7TN (Mayfair)',
    },
    event: {
      id: 'EVT-505',
      eventType: 'Mayfair Charity Gala Feast',
      eventDate: '2026-10-09',
      servingTime: '20:00 BST',
      guestCount: 200,
      deliveryAddress: 'The Grosvenor House Ballroom, W1K',
      dietaryPreference: 'Gourmet Mughlai • Nut-Free Audited',
      status: 'COMPLETED',
    },
  },
];

let localOrdersStore: EnterpriseOrder[] = [...DEFAULT_ORDERS];

export const api = {
  async getMenu(): Promise<{ packages: CateringPackage[]; items: MenuItem[] }> {
    try {
      const res = await fetch(`${API_BASE}/menu`);
      if (!res.ok) throw new Error('Failed to fetch menu');
      return await res.json();
    } catch {
      return {
        packages: [
          {
            packageId: 'PKG-SILVER',
            name: 'Dil Se Classic Feast',
            perPersonPrice: 14.5,
            minGuests: 15,
            description: 'Our quintessential celebration spread with luxury buffet chaffing warmers and cutlery included.',
            badge: 'Most Popular',
            courses: {
              starters: {
                title: 'Starters (Choice of 2)',
                count: 2,
                options: ['Amritsari Fish Tikka (Halal)', 'Tandoori Murgh Tikka (Halal)', 'Punjabi Samosa Platter (Veg)'],
              },
              mains: {
                title: 'Mains (Choice of 2)',
                count: 2,
                options: ['Old Delhi Butter Chicken (Halal)', 'Shahi Kadhai Paneer (Veg)'],
              },
              dal: {
                title: 'Slow-Cooked Dal (Included)',
                count: 1,
                options: ['Slow-Cooked Dal Makhani'],
              },
              rice: {
                title: 'Dum Biryani (Included)',
                count: 1,
                options: ['Awadhi Chicken Dum Biryani', 'Subz Nizami Veg Biryani'],
              },
              bread: {
                title: 'Fresh Breads (Included)',
                count: 1,
                options: ['Fresh Tandoori Butter Naan'],
              },
              dessert: {
                title: 'Dessert (Included)',
                count: 1,
                options: ['Warm Gulab Jamun with Kesari Rabdi'],
              },
            },
          },
          {
            packageId: 'PKG-GOLD',
            name: 'Dil Se Royal Celebration Feast',
            perPersonPrice: 18.0,
            minGuests: 20,
            description: 'Grand royal banquet with Kashmiri Lamb, dual desserts, and artisan Laccha Paratha.',
            badge: 'Grand Luxury',
            courses: {
              starters: {
                title: 'Starters (Choice of 3)',
                count: 3,
                options: ['Amritsari Fish Tikka', 'Tandoori Murgh Tikka', 'Punjabi Samosa Platter'],
              },
              mains: {
                title: 'Mains (Choice of 3)',
                count: 3,
                options: ['Old Delhi Butter Chicken', 'Shahi Kadhai Paneer', 'Kashmiri Rogan Josh Lamb (Halal)'],
              },
              dal: {
                title: 'Dal (Included)',
                count: 1,
                options: ['Slow-Cooked Dal Makhani'],
              },
              rice: {
                title: 'Royal Biryani (Included)',
                count: 1,
                options: ['Awadhi Chicken Dum Biryani', 'Subz Nizami Veg Biryani'],
              },
              bread: {
                title: 'Artisan Breads (Choice of 2)',
                count: 2,
                options: ['Tandoori Butter Naan', 'Crisp Laccha Paratha'],
              },
              dessert: {
                title: 'Luxury Desserts (Choice of 2)',
                count: 2,
                options: ['Warm Gulab Jamun', 'Rasmalai with Pistachio Dust'],
              },
            },
          },
        ],
        items: [
          { id: 'TRY-001', name: 'Awadhi Chicken Dum Biryani', category: 'Biryani & Rice', unitPrice: 55, servesGuests: 10, isHalal: true, description: 'Slow-cooked fragrant basmati rice layered with marinated chicken & saffron.' },
          { id: 'TRY-002', name: 'Subz Nizami Veg Biryani', category: 'Biryani & Rice', unitPrice: 45, servesGuests: 10, isVegetarian: true, description: 'Seasonal vegetables, fragrant spices, and slow-dum basmati rice.' },
          { id: 'TRY-003', name: 'Old Delhi Butter Chicken', category: 'Curries & Mains', unitPrice: 60, servesGuests: 10, isHalal: true, description: 'Charcoal-grilled chicken simmered in rich creamy tomato and fenugreek gravy.' },
          { id: 'TRY-004', name: 'Shahi Kadhai Paneer', category: 'Curries & Mains', unitPrice: 50, servesGuests: 10, isVegetarian: true, description: 'Fresh cottage cheese tossed with bell peppers, crushed coriander and royal spices.' },
          { id: 'TRY-005', name: 'Slow-Cooked Dal Makhani', category: 'Curries & Mains', unitPrice: 40, servesGuests: 10, isVegetarian: true, description: 'Black lentils slow-cooked overnight with churned butter and dairy cream.' },
          { id: 'TRY-006', name: 'Kashmiri Rogan Josh Lamb', category: 'Curries & Mains', unitPrice: 70, servesGuests: 10, isHalal: true, description: 'Tender British Halal lamb simmered with Kashmiri chillies and whole spices.' },
          { id: 'TRY-007', name: 'Amritsari Fish Tikka', category: 'Starters', unitPrice: 42, servesGuests: 10, isHalal: true, description: 'Crispy carom seed and gram flour crusted fish tikka bites.' },
          { id: 'TRY-008', name: 'Tandoori Murgh Tikka', category: 'Starters', unitPrice: 40, servesGuests: 10, isHalal: true, description: 'Smoky chicken breast cubes in mustard oil and hung yogurt marinade.' },
          { id: 'TRY-009', name: 'Punjabi Samosa Platter (20 pcs)', category: 'Starters', unitPrice: 30, servesGuests: 10, isVegetarian: true, description: 'Crisp golden pastries filled with spiced potato and green peas, with tamarind chutney.' },
          { id: 'TRY-010', name: 'Fresh Tandoori Butter Naan (Pack of 10)', category: 'Breads', unitPrice: 14, servesGuests: 10, isVegetarian: true, description: 'Clay-oven baked fluffy leavened flatbreads brushed with dairy butter.' },
          { id: 'TRY-011', name: 'Warm Gulab Jamun (Tray of 20)', category: 'Desserts', unitPrice: 28, servesGuests: 10, isVegetarian: true, description: 'Golden milk dough dumplings soaked in rose and cardamom sugar syrup.' },
          { id: 'TRY-012', name: 'Rasmalai with Pistachio Dust (Tray of 15)', category: 'Desserts', unitPrice: 32, servesGuests: 10, isVegetarian: true, description: 'Delicate cottage cheese discs in thickened saffron milk garnished with pistachios.' },
        ],
      };
    }
  },

  async calculateQuote(payload: {
    orderMode?: 'FEAST_PACKAGE' | 'A_LA_CARTE_TRAYS';
    packageId?: string;
    guestCount?: number;
    postcode?: string;
    dietaryPreference?: string;
    trayItems?: Array<{ dishQuery: string; quantity: number }>;
  }): Promise<{ quote: QuoteCalculationResult; hostProtection: HostProtectionAudit }> {
    try {
      const res = await fetch(`${API_BASE}/calculator/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Calculation failed');
      return await res.json();
    } catch {
      const guests = payload.guestCount || 30;
      const rate = payload.packageId === 'PKG-GOLD' ? 18.0 : 14.5;
      const total = guests * rate;
      const isMixed = (payload.dietaryPreference || '').toLowerCase().includes('mixed');

      return {
        quote: {
          packageName: payload.packageId === 'PKG-GOLD' ? 'Dil Se Royal Celebration Feast' : 'Dil Se Classic Feast',
          perPersonRate: rate,
          guestCount: guests,
          itemsTotal: total,
          deliveryFee: 0,
          totalAmount: total,
          costPerGuest: rate,
          deliveryZoneNote: 'Free Greater London Delivery',
          summaryText: `${guests} Guests @ £${rate.toFixed(2)}/pp`,
          smartReceiptCard: `[DIL SE ROYAL RECEIPT]\nPACKAGE: ${payload.packageId === 'PKG-GOLD' ? 'Dil Se Royal Celebration Feast' : 'Dil Se Classic Feast'}\nCOVERS: ${guests} Guests\nRATE: £${rate.toFixed(2)}/pp\nTOTAL: £${total.toFixed(2)} (Buffet Chafing Included)`,
        },
        hostProtection: {
          isSafe: true,
          trapType: isMixed && guests >= 15 ? 'STEALTH_MEAT_EATER' : 'NONE',
          severity: isMixed && guests >= 15 ? 'WARNING' : 'INFO',
          headline: isMixed && guests >= 15 ? 'Stealth Meat-Eater Protection' : 'Portion Balanced',
          adviceText: isMixed && guests >= 15 ? 'Non-vegetarians almost always tuck into the Paneer too! We apply a 40% vegetarian cushion.' : 'Portions are optimal.',
          formattedBubbleAdvice: isMixed && guests >= 15 ? 'Quick tip from experience: non-vegetarian guests almost always tuck into the Paneer as well! We ensure a generous vegetarian cushion.' : undefined,
        },
      };
    }
  },

  async getOrders(): Promise<{ orders: EnterpriseOrder[] }> {
    try {
      const res = await fetch(`${API_BASE}/orders`);
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      if (data.orders && data.orders.length > 0) return data;
      return { orders: localOrdersStore };
    } catch {
      return { orders: localOrdersStore };
    }
  },

  async updateOrderStatus(orderId: string, status: string): Promise<boolean> {
    localOrdersStore = localOrdersStore.map((o) =>
      o.id === orderId
        ? {
            ...o,
            paymentStatus: status === 'CONFIRMED' ? 'PAID' : o.paymentStatus,
            confirmedAt: status === 'CONFIRMED' ? new Date().toISOString() : o.confirmedAt,
            event: o.event ? { ...o.event, status: status as any } : undefined,
          }
        : o
    );

    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      return res.ok;
    } catch {
      return true;
    }
  },

  async getHandoffs(): Promise<{ handoffs: EnterpriseHandoff[] }> {
    try {
      const res = await fetch(`${API_BASE}/handoffs`);
      if (!res.ok) throw new Error('Failed to fetch handoffs');
      return await res.json();
    } catch {
      return {
        handoffs: [
          {
            id: 'HND-001',
            phoneNumber: '+44 7987 654321',
            reason: 'Host requested bespoke Jain no-root menu consultation with Executive Chef',
            status: 'PENDING',
            createdAt: new Date().toISOString(),
          },
        ],
      };
    }
  },

  async resolveHandoff(phoneNumber: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/handoffs/${phoneNumber}/resolve`, {
        method: 'POST',
      });
      return res.ok;
    } catch {
      return true;
    }
  },

  async getMessages(phoneNumber: string): Promise<{ messages: EnterpriseMessage[] }> {
    try {
      const res = await fetch(`${API_BASE}/messages/${phoneNumber}`);
      if (!res.ok) throw new Error('Failed to fetch messages');
      return await res.json();
    } catch {
      return { messages: [] };
    }
  },

  async getStats(): Promise<DashboardStats> {
    try {
      const res = await fetch(`${API_BASE}/stats`);
      if (!res.ok) throw new Error('Failed to fetch stats');
      return await res.json();
    } catch {
      const totalRev = localOrdersStore.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
      return {
        totalCustomers: 5,
        totalEvents: 5,
        totalOrders: localOrdersStore.length,
        totalRevenue: totalRev,
        pendingHandoffs: 1,
        totalHandoffs: 1,
      };
    }
  },
};
