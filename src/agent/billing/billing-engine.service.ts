import { Injectable, Logger } from '@nestjs/common';
import { MenuService as MenuCacheService, MenuItem, CateringPackage } from '../../menu/menu.service.js';

export interface TrayOrderItem {
  dishId: string;
  dishName: string;
  category: string;
  dietary: string[];
  quantity: number;
  unitTrayPrice: number;
  itemSubtotal: number;
  servesGuests: number;
}

export interface QuoteCalculationResult {
  orderMode: 'FEAST_PACKAGE' | 'A_LA_CARTE_TRAYS';
  packageId?: string;
  packageName?: string;
  perPersonRate?: number;
  guestCount?: number;
  items: TrayOrderItem[];
  foodSubtotal: number;
  deliveryFee: number;
  totalAmount: number;
  feedsGuestCapacity: number;
  costPerGuest: number;
  deliveryZoneNote: string;
  summaryText: string;
  smartReceiptCard: string;
}

@Injectable()
export class BillingEngineService {
  private readonly logger = new Logger(BillingEngineService.name);

  constructor(private readonly menuCacheService: MenuCacheService) {}

  /**
   * Deterministically calculates quotes for Party Trays
   */
  public calculateTrayOrder(params: {
    items: Array<{ dishQuery: string; quantity: number }>;
    guestCount?: number;
    postcode?: string;
  }): QuoteCalculationResult {
    const allMenu = this.menuCacheService.getMenuItems();
    const resolvedItems: TrayOrderItem[] = [];
    let foodSubtotal = 0;
    let totalFeeds = 0;

    for (const requested of params.items) {
      const q = requested.dishQuery.toLowerCase().trim();
      const qty = Math.max(1, Math.round(requested.quantity || 1));

      // Match dish name
      const matched =
        allMenu.find((m) => m.name.toLowerCase().includes(q) || m.id.toLowerCase() === q) ||
        allMenu.find((m) => q.includes(m.name.toLowerCase().split(' ')[0])) ||
        allMenu[0];

      const itemTotal = matched.trayPrice * qty;
      const feeds = (matched.trayServes || 10) * qty;

      foodSubtotal += itemTotal;
      totalFeeds += feeds;

      resolvedItems.push({
        dishId: matched.id,
        dishName: matched.name,
        category: matched.category,
        dietary: matched.dietary,
        quantity: qty,
        unitTrayPrice: matched.trayPrice,
        itemSubtotal: itemTotal,
        servesGuests: feeds,
      });
    }

    const deliveryFee = this.calculateDeliveryFee(params.postcode);
    const totalAmount = foodSubtotal + deliveryFee;
    const effectiveGuests = params.guestCount && params.guestCount > 0 ? params.guestCount : totalFeeds;
    const costPerGuest = Number((totalAmount / effectiveGuests).toFixed(2));

    const itemLines = resolvedItems
      .map((i) => `• ${i.quantity}x ${i.dishName} (Serves ~${i.servesGuests}) — £${i.itemSubtotal.toFixed(2)}`)
      .join('\n');

    const summaryText = resolvedItems.map((i) => `${i.quantity}x ${i.dishName}`).join(', ');

    const smartReceiptCard = `
🧾 *Dil Se Catering — Quote Estimate*
━━━━━━━━━━━━━━━━━━━━━━━
👥 *Capacity:* Serves ~${totalFeeds} guests${params.guestCount ? ` (${params.guestCount} planned)` : ''}
📍 *Delivery:* ${params.postcode ? params.postcode.toUpperCase() : 'London'}

🥘 *Selected Party Trays:*
${itemLines}
━━━━━━━━━━━━━━━━━━━━━━━
💰 *Food Subtotal:* £${foodSubtotal.toFixed(2)}
🚚 *Delivery:* ${deliveryFee === 0 ? 'FREE (Greater London)' : `£${deliveryFee.toFixed(2)}`}
⭐ *Total Amount:* *£${totalAmount.toFixed(2)}*
👉 *Cost per guest:* *£${costPerGuest.toFixed(2)} per person*
━━━━━━━━━━━━━━━━━━━━━━━`.trim();

    return {
      orderMode: 'A_LA_CARTE_TRAYS',
      items: resolvedItems,
      foodSubtotal,
      deliveryFee,
      totalAmount,
      feedsGuestCapacity: totalFeeds,
      costPerGuest,
      deliveryZoneNote: deliveryFee === 0 ? 'Free London delivery' : 'Standard delivery applies',
      summaryText,
      smartReceiptCard,
    };
  }

  /**
   * Deterministically calculates quotes for Full Feast Packages
   */
  public calculateFeastPackage(params: {
    packageIdOrName: string;
    guestCount: number;
    postcode?: string;
  }): QuoteCalculationResult {
    const packages = this.menuCacheService.getPackages();
    const query = params.packageIdOrName.toLowerCase().trim();

    const selectedPkg =
      packages.find((p) => p.id.toLowerCase() === query || p.name.toLowerCase().includes(query)) ||
      packages[1] || // Default to Royal Celebration Feast
      packages[0];

    const guests = Math.max(params.guestCount || selectedPkg.minGuests, 1);
    const foodSubtotal = selectedPkg.perPersonPrice * guests;
    const deliveryFee = this.calculateDeliveryFee(params.postcode);
    const totalAmount = foodSubtotal + deliveryFee;
    const costPerGuest = selectedPkg.perPersonPrice;

    const smartReceiptCard = `
🧾 *Dil Se Catering — Feast Package Estimate*
━━━━━━━━━━━━━━━━━━━━━━━
👑 *Package:* ${selectedPkg.name}
👥 *Guest Count:* ${guests} guests (Min: ${selectedPkg.minGuests})
📍 *Delivery:* ${params.postcode ? params.postcode.toUpperCase() : 'London'}

🍽️ *Buffet Inclusions:*
• ${selectedPkg.inclusions.starters} Starters, ${selectedPkg.inclusions.mains} Mains, ${selectedPkg.inclusions.dal} Dal
• Dum Biryani & Rice, ${selectedPkg.inclusions.breads} Tandoori Breads
• ${selectedPkg.inclusions.desserts} Fresh Desserts (Gulab Jamun / Rasmalai)
• Buffet warmers, luxury chaffing dishes, & cutlery setup
━━━━━━━━━━━━━━━━━━━━━━━
💰 *Package Rate:* £${selectedPkg.perPersonPrice.toFixed(2)} per person
🚚 *Setup & London Delivery:* ${deliveryFee === 0 ? 'FREE Included' : `£${deliveryFee.toFixed(2)}`}
⭐ *Total Amount:* *£${totalAmount.toFixed(2)}*
👉 *Cost per guest:* *£${costPerGuest.toFixed(2)} per person*
━━━━━━━━━━━━━━━━━━━━━━━`.trim();

    return {
      orderMode: 'FEAST_PACKAGE',
      packageId: selectedPkg.id,
      packageName: selectedPkg.name,
      perPersonRate: selectedPkg.perPersonPrice,
      guestCount: guests,
      items: [],
      foodSubtotal,
      deliveryFee,
      totalAmount,
      feedsGuestCapacity: guests,
      costPerGuest,
      deliveryZoneNote: 'Setup & equipment included',
      summaryText: `${selectedPkg.name} for ${guests} guests`,
      smartReceiptCard,
    };
  }

  /**
   * Automatically calculates ideal catering portion baskets
   */
  public recommendPortionsForGuests(guestCount: number, dietaryPreference?: string): Array<{ dishQuery: string; quantity: number }> {
    const guests = Math.max(guestCount, 10);
    const isVegOnly = (dietaryPreference || '').toLowerCase().includes('veg') && !(dietaryPreference || '').toLowerCase().includes('non');
    const basket: Array<{ dishQuery: string; quantity: number }> = [];

    if (isVegOnly) {
      const biryaniTrays = Math.max(1, Math.ceil(guests / 12));
      const paneerTrays = Math.max(1, Math.ceil(guests / 10));
      const dalTrays = Math.max(1, Math.ceil(guests / 15));
      const naanPacks = Math.max(1, Math.ceil((guests * 1.5) / 10));

      basket.push({ dishQuery: 'Subz Nizami Veg Biryani', quantity: biryaniTrays });
      basket.push({ dishQuery: 'Shahi Kadhai Paneer', quantity: paneerTrays });
      basket.push({ dishQuery: 'Slow-Cooked Dal Makhani', quantity: dalTrays });
      basket.push({ dishQuery: 'Fresh Tandoori Butter Naan', quantity: naanPacks });
    } else {
      // Mixed Crowd: 60% Non-veg, 40% Veg
      const chickenBiryaniTrays = Math.max(1, Math.ceil((guests * 0.6) / 10));
      const vegBiryaniTrays = Math.max(1, Math.ceil((guests * 0.4) / 10));
      const chickenCurryTrays = Math.max(1, Math.ceil((guests * 0.6) / 10));
      const dalTrays = Math.max(1, Math.ceil(guests / 15));
      const naanPacks = Math.max(1, Math.ceil((guests * 1.5) / 10));

      basket.push({ dishQuery: 'Awadhi Chicken Dum Biryani', quantity: chickenBiryaniTrays });
      basket.push({ dishQuery: 'Old Delhi Butter Chicken', quantity: chickenCurryTrays });
      basket.push({ dishQuery: 'Slow-Cooked Dal Makhani', quantity: dalTrays });
      basket.push({ dishQuery: 'Fresh Tandoori Butter Naan', quantity: naanPacks });
      if (guests >= 20) {
        basket.push({ dishQuery: 'Subz Nizami Veg Biryani', quantity: vegBiryaniTrays });
      }
    }

    return basket;
  }

  /**
   * Computes UK Postcode delivery fee
   */
  private calculateDeliveryFee(postcode?: string): number {
    if (!postcode) return 0;
    const clean = postcode.toUpperCase().replace(/\s+/g, '');
    const londonPrefixes = ['HA', 'UB', 'TW', 'IG', 'SL', 'WD', 'NW', 'W', 'SW', 'SE', 'E', 'N', 'EC', 'WC', 'EN', 'CR'];
    const isLondonArea = londonPrefixes.some((prefix) => clean.startsWith(prefix));
    return isLondonArea ? 0 : 25; // Free for Greater London; £25 for outer counties
  }
}
