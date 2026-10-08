import { Injectable, Logger } from '@nestjs/common';

export interface HostProtectionAudit {
  isSafe: boolean;
  trapType:
    | 'NONE'
    | 'UNDER_ORDERING'
    | 'STEALTH_MEAT_EATER'
    | 'OVER_ORDERING'
    | 'SPICE_SENSITIVITY'
    | 'DIETARY_GAP';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  headline: string;
  adviceText: string;
  portionDeficitGuests?: number;
  recommendedTrayAdjustment?: string;
  spiceRecommendation?: string;
  formattedBubbleAdvice?: string;
}

export interface OrderAuditParams {
  guestCount?: number;
  orderMode?: 'FEAST_PACKAGE' | 'A_LA_CARTE_TRAYS' | string;
  items?: Array<{ dishName: string; quantity: number }>;
  packageId?: string;
  dietaryPreference?: string;
  userMessage?: string;
}

@Injectable()
export class HostProtectionService {
  private readonly logger = new Logger(HostProtectionService.name);

  // Constants based on commercial UK catering portion standards
  private readonly PORTIONS_PER_TRAY = 10;
  private readonly MIN_TRAYS_PER_10_GUESTS = 1;

  /**
   * Evaluates order parameters deterministically to protect hosts from social embarrassment
   */
  public auditOrder(params: OrderAuditParams): HostProtectionAudit {
    const guests = Math.max(0, params.guestCount || 0);
    const message = (params.userMessage || '').toLowerCase();
    const diet = (params.dietaryPreference || '').toLowerCase();
    const isTrayOrder = params.orderMode === 'A_LA_CARTE_TRAYS' || (!params.orderMode && params.items && params.items.length > 0);

    // 1. Trap: Severe Under-Ordering in Party Trays (CRITICAL: Prevents Social Embarrassment & Starving Guests)
    if (isTrayOrder && guests >= 15 && params.items && params.items.length > 0) {
      const totalTrays = params.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
      const foodCapacityGuests = totalTrays * this.PORTIONS_PER_TRAY;

      if (foodCapacityGuests < guests * 0.65) {
        const deficit = guests - foodCapacityGuests;
        const suggestedExtraTrays = Math.ceil(deficit / this.PORTIONS_PER_TRAY);

        const mentionsKids = message.includes('kid') || message.includes('child') || message.includes('baby') || message.includes('toddler') || message.includes('1st') || message.includes('first birthday');
        const mentionsElders = message.includes('elder') || message.includes('grandparent') || message.includes('in-law') || message.includes('parent') || message.includes('nani') || message.includes('dadi');
        const spiceAddendum = (mentionsKids || mentionsElders)
          ? ` Plus, for the ${mentionsKids ? 'little ones' : 'elders'}, our Chef will keep the dishes mild and buttery with extra chutney on the side.`
          : '';

        return {
          isSafe: false,
          trapType: 'UNDER_ORDERING',
          severity: 'CRITICAL',
          headline: 'Under-Ordering Risk: Food Shortage Detected',
          adviceText: `You have ${guests} guests planned, but ${totalTrays} tray(s) only feed ~${foodCapacityGuests} people. Food will run out within 15 minutes.`,
          portionDeficitGuests: deficit,
          recommendedTrayAdjustment: `Add at least ${suggestedExtraTrays} more catering tray(s) to comfortably feed everyone.`,
          formattedBubbleAdvice: `Just a gentle heads up! ${totalTrays} tray(s) will comfortably feed around ${foodCapacityGuests} guests, so for ${guests} people food might run short. Let's arrange ${totalTrays + suggestedExtraTrays} trays so your guests leave happily full.${spiceAddendum}`,
        };
      }

      // 2. Trap: Severe Over-Ordering (WARNING: Protects host budget and prevents food waste)
      if (foodCapacityGuests > guests * 1.8 && guests >= 10) {
        return {
          isSafe: false,
          trapType: 'OVER_ORDERING',
          severity: 'WARNING',
          headline: 'Over-Ordering Guard: Budget & Food Waste Protection',
          adviceText: `The selected trays will feed ${foodCapacityGuests} guests, but you only have ${guests} guests planned.`,
          recommendedTrayAdjustment: `You could easily reduce 1 or 2 trays and save cost while still keeping portions generous.`,
          formattedBubbleAdvice: `I want to make sure you get the best value—this spread will feed nearly ${foodCapacityGuests} guests! For ${guests} people, you could trim 1 tray, save some budget, and still have plenty of food for everyone.`,
        };
      }
    }

    // 3. Trap: Stealth Meat-Eater (WARNING: Mixed crowds running out of vegetarian/paneer mains)
    const isMixedCrowd = diet.includes('mixed') || (diet.includes('non') && diet.includes('veg')) || message.includes('some veg') || message.includes('few veg');
    if (isMixedCrowd && guests >= 15) {
      return {
        isSafe: true,
        trapType: 'STEALTH_MEAT_EATER',
        severity: 'WARNING',
        headline: 'Stealth Meat-Eater Protection',
        adviceText: 'Meat-eating guests almost always take a scoop of Shahi Paneer alongside their chicken/biryani. If paneer is under-ordered, strict vegetarians are left looking at empty dishes.',
        recommendedTrayAdjustment: 'Maintain a 60% non-veg to 40% veg ratio to prevent vegetarian food running out.',
        formattedBubbleAdvice: `Quick tip from experience: non-vegetarian guests almost always tuck into the Paneer as well! We always make sure there’s a generous vegetarian cushion so your vegetarian guests aren't left looking at empty bowls.`,
      };
    }

    // 4. Trap: Kid / Elder Spice Disconnect (INFO: Spice calibration)
    const mentionsKids = message.includes('kid') || message.includes('child') || message.includes('baby') || message.includes('toddler') || message.includes('1st') || message.includes('first birthday');
    const mentionsElders = message.includes('elder') || message.includes('grandparent') || message.includes('in-law') || message.includes('parent') || message.includes('nani') || message.includes('dadi');

    if (mentionsKids || mentionsElders) {
      const audience = mentionsKids && mentionsElders ? 'the little ones and elderly family members' : mentionsKids ? 'the little ones' : 'elderly guests';
      return {
        isSafe: true,
        trapType: 'SPICE_SENSITIVITY',
        severity: 'INFO',
        headline: 'Mild & Rich Spice Calibration',
        adviceText: `Since you have ${audience} joining, we will ensure our Chef prepares the dishes mild, buttery, and rich in aroma rather than sharp red chili heat.`,
        spiceRecommendation: 'Mild gravies with fresh spiced green chili and mint chutney served strictly on the side.',
        formattedBubbleAdvice: `For ${audience}, I’ll ask Chef to keep the dishes rich and mild so everyone can enjoy comfortably, with our spiced mint chutney on the side for guests who love extra heat.`,
      };
    }

    // 5. Default Safe State
    return {
      isSafe: true,
      trapType: 'NONE',
      severity: 'INFO',
      headline: 'Portion Balanced & Safe',
      adviceText: 'Order portions and dietary splits align comfortably with commercial standards.',
    };
  }
}
