import { Injectable, Logger } from '@nestjs/common';

export interface MenuItem {
  id: string;
  name: string;
  category: 'Starters' | 'Mains' | 'Rice & Biryani' | 'Breads' | 'Desserts' | 'Beverages';
  dietary: ('Vegetarian' | 'Non-Veg' | 'Vegan' | 'Halal' | 'Gluten-Free')[];
  description: string;
  perPersonPrice: number; // When ordered in a buffet per head
  trayPrice: number; // Large catering tray (serves ~10 people)
  trayServes: number; // Number of guests a tray serves (e.g. 10)
  unitPrice: number; // Default reference price
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
export class MenuService {
  private readonly logger = new Logger(MenuService.name);
  private menuItems: MenuItem[] = [];
  private packages: CateringPackage[] = [];

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
        perPersonPrice: 4.5,
        trayPrice: 42.0,
        trayServes: 10,
        unitPrice: 4.5,
        minQuantity: 1,
        available: true,
      },
      {
        id: 'MENU-002',
        name: 'Murgh Malai Tikka',
        category: 'Starters',
        dietary: ['Non-Veg', 'Halal', 'Gluten-Free'],
        description: 'Cardamom & clotted cream marinated tender chicken cooked over charcoal',
        perPersonPrice: 4.5,
        trayPrice: 40.0,
        trayServes: 10,
        unitPrice: 4.5,
        minQuantity: 1,
        available: true,
      },
      {
        id: 'MENU-003',
        name: 'Paneer Tikka Shashlik',
        category: 'Starters',
        dietary: ['Vegetarian', 'Gluten-Free'],
        description: 'Tandoor-charred cottage cheese cubes with bell peppers & royal cumin',
        perPersonPrice: 4.0,
        trayPrice: 38.0,
        trayServes: 10,
        unitPrice: 4.0,
        minQuantity: 1,
        available: true,
      },
      {
        id: 'MENU-004',
        name: 'Delhi 6 Papdi Chaat',
        category: 'Starters',
        dietary: ['Vegetarian'],
        description: 'Crisp flour wafers with spiced chickpeas, whipped yogurt & tamarind glaze',
        perPersonPrice: 3.5,
        trayPrice: 32.0,
        trayServes: 10,
        unitPrice: 3.5,
        minQuantity: 1,
        available: true,
      },
      {
        id: 'MENU-005',
        name: 'Cocktail Vegetable Samosas (35 pcs)',
        category: 'Starters',
        dietary: ['Vegetarian', 'Vegan'],
        description: 'Flaky hand-crimped pastry pockets with spiced potato, peas and ginger',
        perPersonPrice: 3.0,
        trayPrice: 28.0,
        trayServes: 10,
        unitPrice: 3.0,
        minQuantity: 1,
        available: true,
      },
      {
        id: 'MENU-006',
        name: 'Seekh Kebab Dil Se',
        category: 'Starters',
        dietary: ['Non-Veg', 'Halal', 'Gluten-Free'],
        description: 'Melt-in-mouth spiced Welsh lamb mince skewers with fresh mint glaze',
        perPersonPrice: 4.8,
        trayPrice: 46.0,
        trayServes: 10,
        unitPrice: 4.8,
        minQuantity: 1,
        available: true,
      },

      // Mains
      {
        id: 'MENU-101',
        name: 'Old Delhi Butter Chicken',
        category: 'Mains',
        dietary: ['Non-Veg', 'Halal', 'Gluten-Free'],
        description: 'Velvety smoked tomato, fenugreek & slow-churned butter gravy',
        perPersonPrice: 6.5,
        trayPrice: 58.0,
        trayServes: 10,
        unitPrice: 6.5,
        minQuantity: 1,
        available: true,
      },
      {
        id: 'MENU-102',
        name: 'Royal Lamb Rogan Josh',
        category: 'Mains',
        dietary: ['Non-Veg', 'Halal', 'Gluten-Free'],
        description: 'Kashmiri slow-braised lamb shanks with ratanjot & fennel infusion',
        perPersonPrice: 7.5,
        trayPrice: 68.0,
        trayServes: 10,
        unitPrice: 7.5,
        minQuantity: 1,
        available: true,
      },
      {
        id: 'MENU-103',
        name: 'Shahi Paneer Lababdar',
        category: 'Mains',
        dietary: ['Vegetarian', 'Gluten-Free'],
        description: 'Rich roasted tomato-cashew reduction with soft artisan paneer',
        perPersonPrice: 5.5,
        trayPrice: 48.0,
        trayServes: 10,
        unitPrice: 5.5,
        minQuantity: 1,
        available: true,
      },
      {
        id: 'MENU-104',
        name: 'Dal Makhani Bukhara',
        category: 'Mains',
        dietary: ['Vegetarian', 'Gluten-Free'],
        description: '24-hour slow simmered black urad lentils with cultured white butter',
        perPersonPrice: 4.5,
        trayPrice: 42.0,
        trayServes: 10,
        unitPrice: 4.5,
        minQuantity: 1,
        available: true,
      },
      {
        id: 'MENU-105',
        name: 'Pindi Chana Masala',
        category: 'Mains',
        dietary: ['Vegetarian', 'Vegan', 'Gluten-Free'],
        description: 'Tea-infused tangy kabuli chickpeas cooked with roasted pomegranate seed powder',
        perPersonPrice: 4.0,
        trayPrice: 38.0,
        trayServes: 10,
        unitPrice: 4.0,
        minQuantity: 1,
        available: true,
      },
      {
        id: 'MENU-106',
        name: 'Methi Malai Matar',
        category: 'Mains',
        dietary: ['Vegetarian', 'Gluten-Free'],
        description: 'Fresh fenugreek leaves and sweet green peas in creamy cashew sauce',
        perPersonPrice: 5.0,
        trayPrice: 44.0,
        trayServes: 10,
        unitPrice: 5.0,
        minQuantity: 1,
        available: true,
      },

      // Rice & Biryani
      {
        id: 'MENU-201',
        name: 'Dum Pukht Gosht Biryani',
        category: 'Rice & Biryani',
        dietary: ['Non-Veg', 'Halal'],
        description: 'Fragrant basmati rice layered with spiced tender lamb under sealed dough crust',
        perPersonPrice: 6.0,
        trayPrice: 56.0,
        trayServes: 10,
        unitPrice: 6.0,
        minQuantity: 1,
        available: true,
      },
      {
        id: 'MENU-202',
        name: 'Awadhi Chicken Biryani',
        category: 'Rice & Biryani',
        dietary: ['Non-Veg', 'Halal'],
        description: 'Aromatic Lucknowi saffron rice and slow-cooked bone-in chicken thighs',
        perPersonPrice: 5.5,
        trayPrice: 52.0,
        trayServes: 10,
        unitPrice: 5.5,
        minQuantity: 1,
        available: true,
      },
      {
        id: 'MENU-203',
        name: 'Hyderabadi Subz Biryani',
        category: 'Rice & Biryani',
        dietary: ['Vegetarian', 'Gluten-Free'],
        description: 'Garden vegetables, mint, caramelized onions and aged long-grain basmati',
        perPersonPrice: 4.5,
        trayPrice: 42.0,
        trayServes: 10,
        unitPrice: 4.5,
        minQuantity: 1,
        available: true,
      },
      {
        id: 'MENU-204',
        name: 'Jeera & Saffron Pulao',
        category: 'Rice & Biryani',
        dietary: ['Vegetarian', 'Vegan', 'Gluten-Free'],
        description: 'Ghee-tempered cumin and Kashmiri saffron steamed basmati',
        perPersonPrice: 2.5,
        trayPrice: 24.0,
        trayServes: 10,
        unitPrice: 2.5,
        minQuantity: 1,
        available: true,
      },

      // Breads
      {
        id: 'MENU-301',
        name: 'Butter & Garlic Naan Basket',
        category: 'Breads',
        dietary: ['Vegetarian'],
        description: 'Fresh clay-oven leavened breads brushed with garlic butter & coriander',
        perPersonPrice: 2.0,
        trayPrice: 20.0,
        trayServes: 10,
        unitPrice: 2.0,
        minQuantity: 1,
        available: true,
      },
      {
        id: 'MENU-302',
        name: 'Lachha Paratha',
        category: 'Breads',
        dietary: ['Vegetarian'],
        description: 'Multi-layered flaky whole wheat bread baked over tandoor',
        perPersonPrice: 2.2,
        trayPrice: 22.0,
        trayServes: 10,
        unitPrice: 2.2,
        minQuantity: 1,
        available: true,
      },

      // Desserts
      {
        id: 'MENU-401',
        name: 'Warm Gulab Jamun with Rabdi',
        category: 'Desserts',
        dietary: ['Vegetarian'],
        description: 'Golden milk solids dumplings in cardamom syrup served with thickened rabdi',
        perPersonPrice: 3.5,
        trayPrice: 32.0,
        trayServes: 10,
        unitPrice: 3.5,
        minQuantity: 1,
        available: true,
      },
      {
        id: 'MENU-402',
        name: 'Kesar Rasmalai',
        category: 'Desserts',
        dietary: ['Vegetarian', 'Gluten-Free'],
        description: 'Poached artisanal chenna patties steeped in saffron-pistachio infused milk',
        perPersonPrice: 4.0,
        trayPrice: 36.0,
        trayServes: 10,
        unitPrice: 4.0,
        minQuantity: 1,
        available: true,
      },
      {
        id: 'MENU-403',
        name: 'Moong Dal Halwa',
        category: 'Desserts',
        dietary: ['Vegetarian', 'Gluten-Free'],
        description: 'Royal Rajasthani golden lentil pudding roasted slowly in pure desi ghee',
        perPersonPrice: 4.0,
        trayPrice: 38.0,
        trayServes: 10,
        unitPrice: 4.0,
        minQuantity: 1,
        available: true,
      },
    ];

    this.packages = [
      {
        id: 'PKG-SILVER',
        name: 'Silver Classic Feast',
        perPersonPrice: 15.0,
        minGuests: 15,
        description: 'Essential luxury celebration banquet suitable for intimate and casual gatherings.',
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
        name: 'Royal Gold Celebration Feast',
        perPersonPrice: 18.0,
        minGuests: 20,
        description: 'Our most sought-after banquet package with expansive courses and live tandoor finishes.',
        inclusions: {
          starters: 3,
          mains: 3,
          dal: 1,
          rice: 1,
          breads: 1,
          desserts: 2,
        },
      },
      {
        id: 'PKG-PLATINUM',
        name: 'Emperor Platinum Dastarkhwan',
        perPersonPrice: 22.0,
        minGuests: 25,
        description: 'Ultra-premium imperial royal feast for grand weddings, galas, and bespoke hospitality.',
        inclusions: {
          starters: 4,
          mains: 4,
          dal: 1,
          rice: 1,
          breads: 1,
          desserts: 1,
        },
      },
    ];

    this.logger.log(`Initialized menu catalog with ${this.menuItems.length} dishes and ${this.packages.length} curated feast packages.`);
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
}

// Backwards compatibility alias
export { MenuService as MenuCacheService };
