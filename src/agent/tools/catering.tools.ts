import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { MenuService as MenuCacheService } from '../../menu/menu.service.js';
import { BillingEngineService } from '../billing/billing-engine.service.js';

export function createCateringTools(
  menuCacheService: MenuCacheService,
  billingEngine: BillingEngineService,
) {
  const getMenuTool = new DynamicStructuredTool({
    name: 'get_menu',
    description: 'Retrieves live dishes from the Dil Se Catering menu, including tray prices (serves 10) and per-head prices.',
    schema: z.object({
      category: z.string().optional().describe('Category filter: Starters, Mains, Rice & Biryani, Breads, Desserts'),
      dietary: z.string().optional().describe('Dietary filter: Vegetarian, Non-Veg, Halal, Vegan'),
    }),
    func: async ({ category, dietary }) => {
      let items = menuCacheService.getMenuItems();
      if (category) {
        items = items.filter((i) => i.category.toLowerCase().includes(category.toLowerCase()));
      }
      if (dietary) {
        items = items.filter((i) => i.dietary.some((d) => d.toLowerCase().includes(dietary.toLowerCase())));
      }
      return JSON.stringify(
        items.map((i) => ({
          id: i.id,
          name: i.name,
          category: i.category,
          dietary: i.dietary,
          trayPrice: `£${i.trayPrice} (feeds ~${i.trayServes || 10} guests)`,
          perHeadPrice: `£${i.perPersonPrice}`,
        })),
        null,
        2,
      );
    },
  });

  const getPackagesTool = new DynamicStructuredTool({
    name: 'get_packages',
    description: 'Retrieves curated multi-course Royal Feast buffet packages with per-person pricing, inclusions, and minimum guest thresholds.',
    schema: z.object({}),
    func: async () => {
      const pkgs = menuCacheService.getPackages();
      return JSON.stringify(
        pkgs.map((p) => ({
          id: p.id,
          name: p.name,
          perPersonRate: `£${p.perPersonPrice} per person`,
          minGuests: p.minGuests,
          inclusions: p.inclusions,
          description: p.description,
        })),
        null,
        2,
      );
    },
  });

  const calculateQuoteTool = new DynamicStructuredTool({
    name: 'calculate_quote',
    description: 'Calculates exact, verified catering pricing, tray portion coverage, cost-per-guest, and delivery fees. Use this whenever the customer asks for a price, quote, or total.',
    schema: z.object({
      orderMode: z.enum(['FEAST_PACKAGE', 'A_LA_CARTE_TRAYS']).describe('Whether the order is for party trays or complete per-person buffet spread'),
      items: z
        .array(
          z.object({
            dishName: z.string().describe('Name or keyword of the dish (e.g. Biryani, Butter Chicken, Dal Makhani)'),
            quantity: z.number().describe('Number of catering trays or packs'),
          }),
        )
        .optional()
        .describe('List of dishes and quantities for party tray orders'),
      packageId: z.string().optional().describe('Package ID or name (e.g. PKG-GOLD or Royal Celebration) for buffet orders'),
      guestCount: z.number().optional().describe('Number of guests attending'),
      postcode: z.string().optional().describe('UK delivery postcode (e.g. HA9, UB1)'),
    }),
    func: async ({ orderMode, items, packageId, guestCount, postcode }) => {
      if (orderMode === 'FEAST_PACKAGE' || packageId) {
        const quote = billingEngine.calculateFeastPackage({
          packageIdOrName: packageId || 'PKG-GOLD',
          guestCount: guestCount || 20,
          postcode,
        });
        return JSON.stringify(quote, null, 2);
      } else {
        const dishItems = (items && items.length > 0)
          ? items.map((i) => ({ dishQuery: i.dishName, quantity: i.quantity }))
          : billingEngine.recommendPortionsForGuests(guestCount || 20);

        const quote = billingEngine.calculateTrayOrder({
          items: dishItems,
          guestCount,
          postcode,
        });
        return JSON.stringify(quote, null, 2);
      }
    },
  });

  const recommendPortionsTool = new DynamicStructuredTool({
    name: 'recommend_portions',
    description: 'Calculates the recommended tray quantities and dishes needed for a given guest count so food never runs out.',
    schema: z.object({
      guestCount: z.number().describe('Number of guests attending the event'),
      dietaryPreference: z.string().optional().describe('Vegetarian, Mixed, Non-Veg, Halal'),
      postcode: z.string().optional().describe('UK delivery postcode'),
    }),
    func: async ({ guestCount, dietaryPreference, postcode }) => {
      const basket = billingEngine.recommendPortionsForGuests(guestCount, dietaryPreference);
      const quote = billingEngine.calculateTrayOrder({
        items: basket,
        guestCount,
        postcode,
      });
      return JSON.stringify(
        {
          guestCount,
          recommendedBasket: basket,
          calculation: quote,
        },
        null,
        2,
      );
    },
  });

  return [getMenuTool, getPackagesTool, calculateQuoteTool, recommendPortionsTool];
}
