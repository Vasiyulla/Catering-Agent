import { Injectable, Logger } from '@nestjs/common';

export interface MenuItem {
  id: string;
  name: string;
  category: 'Starters' | 'Mains' | 'Rice & Biryani' | 'Breads' | 'Desserts' | 'Beverages';
  dietary: ('Vegetarian' | 'Non-Veg' | 'Vegan' | 'Halal' | 'Gluten-Free')[];
  description: string;
  pricingType: 'Per Person' | 'Per Tray' | 'Fixed';
  unitPrice: number;
  minQuantity: number;
  available: boolean;
}

export interface CateringPackage {
  id: string;
  name: string;
  perPersonPrice: number;
  minGuests: number;
  description: string;
  inclusions: {
    starters: number;
    mains: number;
    dal: number;
    rice: number;
    breads: number;
    desserts: number;
  };
}

@Injectable()
export class MenuCacheService {
  private readonly logger = new Logger(MenuCacheService.name);
  private menuItems: MenuItem[] = [];
  private packages: CateringPackage[] = [];
  private lastFetchedAt: number = 0;
  private readonly TTL_MS = 15 * 60 * 1000; // 15 minutes

  constructor() {
    this.seedDefaultMenu();
  }

  private seedDefaultMenu(): void {
    this.menuItems = [
      // Starters
      {
        id: 'MENU-001',
        name: 'Amritsari Fish Tikka',
        category: 'Starters',
        dietary: ['Non-Veg', 'Halal'],
        description: 'Crisp carom-spiced batter fried white fish with mint chutney',
        pricingType: 'Per Person',
        unitPrice: 4.5,
        minQuantity: 15,
        available: true,
      },
      {
        id: 'MENU-002',
        name: 'Paneer Tikka Shashlik',
        category: 'Starters',
        dietary: ['Vegetarian', 'Gluten-Free'],
        description: 'Tandoor-charred cottage cheese cubes with bell peppers and spiced yoghurt marinade',
        pricingType: 'Per Person',
        unitPrice: 3.5,
        minQuantity: 15,
        available: true,
      },
      {
        id: 'MENU-003',
        name: 'Murgh Malai Tikka',
        category: 'Starters',
        dietary: ['Non-Veg', 'Halal'],
        description: 'Tender chicken skewers infused with cream cheese, green cardamom, and fresh coriander',
        pricingType: 'Per Person',
        unitPrice: 4.0,
        minQuantity: 15,
        available: true,
      },
      {
        id: 'MENU-004',
        name: 'Crispy Hara Bhara Kebab',
        category: 'Starters',
        dietary: ['Vegetarian', 'Vegan'],
        description: 'Golden spinach, green peas, and potato patties scented with roasted cumin',
        pricingType: 'Per Person',
        unitPrice: 3.0,
        minQuantity: 15,
        available: true,
      },

      // Mains
      {
        id: 'MENU-005',
        name: 'Old Delhi Butter Chicken',
        category: 'Mains',
        dietary: ['Non-Veg', 'Halal'],
        description: 'Pulled tandoori chicken simmered in a velvety tomato, butter, and fenugreek gravy',
        pricingType: 'Per Person',
        unitPrice: 6.5,
        minQuantity: 15,
        available: true,
      },
      {
        id: 'MENU-006',
        name: 'Shahi Kadhai Paneer',
        category: 'Mains',
        dietary: ['Vegetarian', 'Gluten-Free'],
        description: 'Paneer batons tossed with coarsely crushed coriander seeds, bell peppers, and rich tomato masala',
        pricingType: 'Per Person',
        unitPrice: 5.5,
        minQuantity: 15,
        available: true,
      },
      {
        id: 'MENU-007',
        name: 'Slow-Cooked Dal Makhani',
        category: 'Mains',
        dietary: ['Vegetarian', 'Gluten-Free'],
        description: 'Black lentils slow-cooked overnight with churned butter and Kashmiri chili',
        pricingType: 'Per Person',
        unitPrice: 4.5,
        minQuantity: 15,
        available: true,
      },
      {
        id: 'MENU-008',
        name: 'Kashmiri Rogan Josh (Lamb)',
        category: 'Mains',
        dietary: ['Non-Veg', 'Halal'],
        description: 'Tender lamb cuts braised in aromatic alkanet root, fennel, and browned shallot gravy',
        pricingType: 'Per Person',
        unitPrice: 7.5,
        minQuantity: 15,
        available: true,
      },

      // Rice & Biryani
      {
        id: 'MENU-009',
        name: 'Awadhi Chicken Dum Biryani',
        category: 'Rice & Biryani',
        dietary: ['Non-Veg', 'Halal'],
        description: 'Fragrant aged basmati rice and marinated chicken sealed in dough and dum-cooked with saffron and kewra',
        pricingType: 'Per Person',
        unitPrice: 6.0,
        minQuantity: 15,
        available: true,
      },
      {
        id: 'MENU-010',
        name: 'Subz Nizami Biryani (Veg)',
        category: 'Rice & Biryani',
        dietary: ['Vegetarian'],
        description: 'Seasonal vegetables and basmati rice dum-cooked with whole spices and brown onions',
        pricingType: 'Per Person',
        unitPrice: 5.0,
        minQuantity: 15,
        available: true,
      },

      // Breads
      {
        id: 'MENU-011',
        name: 'Fresh Tandoori Butter Naan',
        category: 'Breads',
        dietary: ['Vegetarian'],
        description: 'Soft leavened refined flour flatbread brushed with organic butter',
        pricingType: 'Per Person',
        unitPrice: 1.5,
        minQuantity: 15,
        available: true,
      },
      {
        id: 'MENU-012',
        name: 'Crisp Laccha Paratha',
        category: 'Breads',
        dietary: ['Vegetarian'],
        description: 'Flaky multi-layered whole wheat bread baked in clay tandoor',
        pricingType: 'Per Person',
        unitPrice: 1.8,
        minQuantity: 15,
        available: true,
      },

      // Desserts
      {
        id: 'MENU-013',
        name: 'Warm Gulab Jamun with Kesari Rabdi',
        category: 'Desserts',
        dietary: ['Vegetarian'],
        description: 'Deep fried milk dough dumplings soaked in rose syrup served alongside condensed saffron milk',
        pricingType: 'Per Person',
        unitPrice: 3.0,
        minQuantity: 15,
        available: true,
      },
      {
        id: 'MENU-014',
        name: 'Rasmalai with Pistachio Dust',
        category: 'Desserts',
        dietary: ['Vegetarian'],
        description: 'Delicate cottage cheese patties soaked in chilled cardamom milk and crushed slivered nuts',
        pricingType: 'Per Person',
        unitPrice: 3.5,
        minQuantity: 15,
        available: true,
      },
    ];

    this.packages = [
      {
        id: 'PKG-SILVER',
        name: 'Dil Se Classic Feast',
        perPersonPrice: 14.5,
        minGuests: 15,
        description: 'Ideal for intimate gatherings, pujas, and birthdays.',
        inclusions: {
          starters: 2,
          mains: 2,
          dal: 1,
          rice: 1,
          breads: 1,
          desserts: 1,
        },
      },
      {
        id: 'PKG-GOLD',
        name: 'Dil Se Royal Celebration Feast',
        perPersonPrice: 18.0,
        minGuests: 20,
        description: 'Our most popular feast for weddings, anniversaries, and grand celebrations.',
        inclusions: {
          starters: 3,
          mains: 3,
          dal: 1,
          rice: 1,
          breads: 2,
          desserts: 2,
        },
      },
      {
        id: 'PKG-CORPORATE',
        name: 'Executive Office Buffet',
        perPersonPrice: 13.0,
        minGuests: 20,
        description: 'Quick serving, mess-free corporate lunch with warmers and eco disposables.',
        inclusions: {
          starters: 1,
          mains: 2,
          dal: 1,
          rice: 1,
          breads: 1,
          desserts: 1,
        },
      },
    ];

    this.lastFetchedAt = Date.now();
    this.logger.log(`Initialized in-memory menu cache with ${this.menuItems.length} items and ${this.packages.length} curated packages.`);
  }

  public getMenuItems(): MenuItem[] {
    return this.menuItems;
  }

  public getPackages(): CateringPackage[] {
    return this.packages;
  }

  public searchItems(query: string, dietary?: string, category?: string): MenuItem[] {
    const q = query.toLowerCase().trim();
    return this.menuItems.filter((item) => {
      const matchName = item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
      const matchDietary = dietary ? item.dietary.some((d) => d.toLowerCase() === dietary.toLowerCase()) : true;
      const matchCategory = category ? item.category.toLowerCase() === category.toLowerCase() : true;
      return matchName && matchDietary && matchCategory && item.available;
    });
  }

  public getPackageById(packageId: string): CateringPackage | undefined {
    return this.packages.find((pkg) => pkg.id.toUpperCase() === packageId.toUpperCase());
  }

  public getItemById(itemId: string): MenuItem | undefined {
    return this.menuItems.find((item) => item.id.toUpperCase() === itemId.toUpperCase());
  }

  public setCache(items: MenuItem[], packages: CateringPackage[]): void {
    this.menuItems = items;
    this.packages = packages;
    this.lastFetchedAt = Date.now();
    this.logger.log(`Refreshed menu cache with ${items.length} items and ${packages.length} packages.`);
  }

  public isCacheStale(): boolean {
    return Date.now() - this.lastFetchedAt > this.TTL_MS;
  }
}
