import { StateGraph, MemorySaver } from '@langchain/langgraph';
import { Logger } from '@nestjs/common';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { CateringStateAnnotation, CateringStateType, CateringStateUpdate } from './catering.state.js';
import { MenuCacheService } from '../../airtable/menu-cache.service.js';
import { AirtableService } from '../../airtable/airtable.service.js';
import { DatabaseService } from '../../database/database.service.js';
import { BillingEngineService, QuoteCalculationResult } from '../billing/billing-engine.service.js';
import { HostProtectionService, HostProtectionAudit } from '../protection/host-protection.service.js';
import { SYSTEM_PROMPT } from '../prompts/system.prompt.js';

interface ModelOutputJson {
  thought?: string;
  replyMessage: string;
  splitBubbles?: string[];
  suggestedButtons?: { id: string; title: string }[];
  extractedSlots?: {
    orderMode?: string | null;
    eventType?: string | null;
    eventDate?: string | null;
    servingTime?: string | null;
    guestCount?: number | null;
    deliveryLocation?: string | null;
    dietaryPreference?: string | null;
    selectedPackageId?: string | null;
    estimatedTotal?: number | null;
    itemsSummary?: string | null;
  };
  isConfirmed?: boolean;
  requiresHandoff?: boolean;
  handoffReason?: string;
}

// Deterministic Slot Extraction & Sanitization Helpers
function extractGuestCount(text: string): number | null {
  if (!text) return null;
  const m1 = text.match(/(\d{1,4})\s*(?:people|guests|persons|pax|heads|members)/i);
  if (m1) return parseInt(m1[1], 10);
  const m2 = text.match(/\bfor\s+(\d{1,4})\b/i);
  if (m2) return parseInt(m2[1], 10);
  const m3 = text.match(/(?:around|approx(?:imately)?)\s*(\d{1,4})/i);
  if (m3) return parseInt(m3[1], 10);
  return null;
}

function extractLocationOrPostcode(text: string): string | null {
  if (!text) return null;
  const pcMatch =
    text.match(/\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/i) ||
    text.match(/\b(HA\d|UB\d|TW\d|IG\d|SL\d|WD\d|NW\d|W\d|SW\d|SE\d|E\d|N\d|EC\d|WC\d|EN\d|CR\d)\b/i);
  if (pcMatch) return pcMatch[1].toUpperCase().trim();

  const areas = [
    'wembley', 'harrow', 'southall', 'ilford', 'hounslow', 'ealing', 'croydon',
    'slough', 'watford', 'stratford', 'canary wharf', 'barnet', 'kingston', 'central london'
  ];
  const lower = text.toLowerCase();
  for (const a of areas) {
    if (lower.includes(a)) {
      return a.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
  }
  return null;
}

function extractDietary(text: string): string | null {
  if (!text) return null;
  const l = text.toLowerCase();
  if ((l.includes('non-veg') || l.includes('non veg')) && (l.includes('veg') || l.includes('vegetarian'))) return 'Mixed (Non-Veg & Veg)';
  if (l.includes('pure veg') || l.includes('strict veg') || l.includes('only veg') || l.includes('vegetarian')) return 'Vegetarian';
  if (l.includes('jain')) return 'Jain';
  if (l.includes('halal')) return 'Certified Halal';
  if (l.includes('vegan')) return 'Vegan';
  return null;
}

function extractTrayDishes(text: string): Array<{ dishQuery: string; quantity: number }> {
  if (!text) return [];
  const items: Array<{ dishQuery: string; quantity: number }> = [];
  const lower = text.toLowerCase();

  const dishKeywords = [
    { key: 'butter chicken', name: 'Butter Chicken' },
    { key: 'chicken tikka', name: 'Chicken Tikka' },
    { key: 'chicken curry', name: 'Butter Chicken' },
    { key: 'biryani', name: 'Biryani' },
    { key: 'paneer', name: 'Paneer' },
    { key: 'dal makhani', name: 'Dal Makhani' },
    { key: 'dal', name: 'Dal Makhani' },
    { key: 'naan', name: 'Naan' },
    { key: 'lamb', name: 'Lamb Rogan Josh' },
    { key: 'samosa', name: 'Punjabi Samosa' },
    { key: 'gulab jamun', name: 'Gulab Jamun' },
  ];

  for (const d of dishKeywords) {
    if (lower.includes(d.key)) {
      if (items.some((i) => i.dishQuery.toLowerCase() === d.name.toLowerCase())) continue;

      const r1 = new RegExp(`(\\d+)\\s*(?:trays?|packs?|boxes?)?\\s*(?:of\\s+)?${d.key}`, 'i');
      const r2 = new RegExp(`${d.key}\\s*(?:x|\\*|:)?\\s*(\\d+)`, 'i');
      const m1 = lower.match(r1);
      const m2 = lower.match(r2);
      let qty = 1;
      if (m1) qty = parseInt(m1[1], 10);
      else if (m2) qty = parseInt(m2[1], 10);

      items.push({ dishQuery: d.name, quantity: Math.max(1, qty) });
    }
  }
  return items;
}

function sanitizeBubbleText(text: string): string {
  if (!text) return '';
  return text
    .replace(/^(?:[\*\_\[\(\{]*\s*)?(?:bubble|message|part|screen)\s*\d+\s*[:\-\]\)\}]*\s*/i, '')
    .trim();
}

function buildDeterministicFallback(params: {
  verifiedQuoteResult: QuoteCalculationResult | null;
  hostProtectionAudit: HostProtectionAudit | null;
  effectiveGuests: number;
  effectiveLocation: string;
  orderMode: string;
  userText: string;
}): { splitBubbles: string[]; buttons: { id: string; title: string }[] } {
  const { verifiedQuoteResult, hostProtectionAudit, effectiveGuests, effectiveLocation, orderMode, userText } = params;

  // 1. If deterministic quote is ready, deliver instant transparent receipt card
  if (verifiedQuoteResult) {
    const leadAdvice = hostProtectionAudit?.formattedBubbleAdvice
      ? `\n\n${hostProtectionAudit.formattedBubbleAdvice}`
      : '';
    const locNote = effectiveLocation ? ` in ${effectiveLocation}` : '';
    const guestNote = effectiveGuests > 0 ? ` for your gathering of ${effectiveGuests} guests${locNote}` : locNote;

    const bubble1 = `Namaste! 🙏 Welcome to Dil Se Catering ❤️${guestNote ? `\n\nHere is your transparent catering quotation${guestNote}:` : ''}${leadAdvice}`;
    const bubble2 = verifiedQuoteResult.smartReceiptCard;

    return {
      splitBubbles: [bubble1.trim(), bubble2.trim()],
      buttons: [
        { id: 'btn_confirm', title: '✅ Lock This Quote' },
        { id: 'btn_adjust', title: '🥘 Adjust Dishes' },
        { id: 'btn_human', title: '💬 Speak to Chef' },
      ],
    };
  }

  // 2. If client is specifically asking for the menu or dishes
  if (userText.includes('menu') || userText.includes('dish') || userText.includes('spread') || userText.includes('what do you have') || userText.includes('food')) {
    const bubble1 = `Here is our delicious Dil Se Classic Feast menu spread for your celebration! 🍽️`;
    const bubble2 = `👑 *Dil Se Classic Feast Spread (£14.50/person):*\n• *Starters*: Amritsari Fish Tikka & Punjabi Samosas\n• *Mains*: Old Delhi Butter Chicken & Shahi Kadhai Paneer\n• *Dal*: Slow-Cooked Dal Makhani\n• *Rice*: Awadhi Chicken Dum Biryani\n• *Bread*: Fresh Tandoori Butter Naan\n• *Dessert*: Warm Gulab Jamun\n*(Includes buffet warmers, chaffing dishes & cutlery setup)*\n\nWould you like to customize any dishes, or explore bulk Party Trays?`;
    return {
      splitBubbles: [bubble1.trim(), bubble2.trim()],
      buttons: [
        { id: 'btn_classic', title: '👑 Classic Feast' },
        { id: 'btn_trays', title: '🥘 Party Trays' },
        { id: 'btn_human', title: '💬 Customise Dishes' },
      ],
    };
  }

  // 3. If Feast Buffet Packages requested
  if (orderMode === 'FEAST_PACKAGE' || userText.includes('feast') || userText.includes('package') || userText.includes('buffet')) {
    const advice = hostProtectionAudit?.formattedBubbleAdvice
      ? `\n\n${hostProtectionAudit.formattedBubbleAdvice}`
      : '';
    const bubble1 = `Lovely choice! Our Royal Feast buffets include fresh starters, slow-cooked curries, dum biryani, fresh naan, and desserts with luxury warmers & setup.${advice}`;
    const bubble2 = `• 👑 Dil Se Classic Feast: £14.50/person\n• 👑 Royal Celebration Feast: £18.00/person\n• 💼 Executive Buffet: £13.00/person\n\nApproximately how many guests are you expecting?`;
    return {
      splitBubbles: [bubble1.trim(), bubble2.trim()],
      buttons: [
        { id: 'pkg_classic', title: 'Classic (£14.50)' },
        { id: 'pkg_royal', title: 'Royal (£18.00)' },
        { id: 'btn_trays', title: '🥘 Party Trays' },
      ],
    };
  }

  // 3. If Party Trays or Bulk Dishes requested
  if (orderMode === 'A_LA_CARTE_TRAYS' || userText.includes('tray') || userText.includes('bulk')) {
    const advice = hostProtectionAudit?.formattedBubbleAdvice
      ? `\n\n${hostProtectionAudit.formattedBubbleAdvice}`
      : '';
    const bubble1 = `Spot on! Our bulk Party Trays generously serve ~10 guests each:\n• Awadhi Chicken Biryani: £55\n• Old Delhi Butter Chicken: £60\n• Shahi Kadhai Paneer: £50\n• Slow-Cooked Dal Makhani: £40\n• Amritsari Fish Tikka: £42\n• Tandoori Naan Pack: £14${advice}`;
    const bubble2 = `Which dishes and how many trays would you like to arrange?`;
    return {
      splitBubbles: [bubble1.trim(), bubble2.trim()],
      buttons: [
        { id: 'tray_biryani', title: '🍗 Biryani Tray' },
        { id: 'tray_butterchicken', title: '🍛 Butter Chicken' },
        { id: 'tray_paneer', title: '🧀 Paneer Tray' },
      ],
    };
  }

  // 4. Default Warm Hospitality Greeting
  const advice = hostProtectionAudit?.formattedBubbleAdvice
    ? `\n\n${hostProtectionAudit.formattedBubbleAdvice}`
    : '';
  const bubble1 = `Namaste! Welcome to Dil Se Catering ❤️ Food prepared with pure love for your celebrations.${advice}`;
  const bubble2 = `Are you looking for our complete per-person Feast Buffet, or individual bulk Party Trays?`;
  return {
    splitBubbles: [bubble1.trim(), bubble2.trim()],
    buttons: [
      { id: 'btn_feast', title: '👑 Complete Feast' },
      { id: 'btn_trays', title: '🥘 Party Trays' },
      { id: 'btn_human', title: '💬 Speak to Chef' },
    ],
  };
}

export function buildCateringGraph(
  llm: BaseChatModel | null,
  menuCacheService: MenuCacheService,
  airtableService?: AirtableService,
  databaseService?: DatabaseService,
  billingEngine?: BillingEngineService,
  hostProtectionService?: HostProtectionService,
) {
  const logger = new Logger('CateringGraph');
  const memorySaver = new MemorySaver();

  const assistantNode = async (state: CateringStateType): Promise<CateringStateUpdate> => {
    logger.log(`Processing state for phone ${state.phoneNumber}. Stage: ${state.currentStage}`);

    const rawMsg = state.lastUserMessage || '';
    const userText = rawMsg.toLowerCase();

    // Deterministic Slot Extraction (Sub-millisecond regex execution)
    const extractedGuests = extractGuestCount(rawMsg);
    const extractedLocation = extractLocationOrPostcode(rawMsg);
    const extractedDiet = extractDietary(rawMsg);
    const extractedDishes = extractTrayDishes(rawMsg);

    const effectiveGuests = state.guestCount || extractedGuests || 0;
    const effectiveLocation = state.deliveryLocation || extractedLocation || '';
    const effectiveDiet = state.dietaryPreference || extractedDiet || '';
    const userWantsTrays =
      extractedDishes.length > 0 ||
      userText.includes('tray') ||
      userText.includes('bulk') ||
      userText.includes('biryani') ||
      userText.includes('dish') ||
      userText.includes('naan');

    const userWantsFeast =
      userText.includes('feast') ||
      userText.includes('package') ||
      userText.includes('buffet') ||
      userText.includes('per person') ||
      userText.includes('per head');

    let orderMode: 'FEAST_PACKAGE' | 'A_LA_CARTE_TRAYS' = userWantsTrays
      ? 'A_LA_CARTE_TRAYS'
      : userWantsFeast
        ? 'FEAST_PACKAGE'
        : ((state.orderMode as any) || 'FEAST_PACKAGE');

    // Deterministic Live Billing Calculation
    let verifiedCalculationContext = 'No specific quote requested in current turn.';
    let verifiedQuoteResult: QuoteCalculationResult | null = null;

    if (billingEngine) {
      if (orderMode === 'A_LA_CARTE_TRAYS' || userWantsTrays) {
        const parsedItems: Array<{ dishQuery: string; quantity: number }> = [...extractedDishes];

        if (parsedItems.length === 0 && effectiveGuests > 0) {
          parsedItems.push(...billingEngine.recommendPortionsForGuests(effectiveGuests, effectiveDiet));
        }

        if (parsedItems.length > 0) {
          verifiedQuoteResult = billingEngine.calculateTrayOrder({
            items: parsedItems,
            guestCount: effectiveGuests || undefined,
            postcode: effectiveLocation,
          });
          verifiedCalculationContext = `
DETERMINISTIC BILLING ENGINE VERIFIED QUOTE:
• Mode: Party Trays (generously serves 10 guests per tray)
• Trays: ${verifiedQuoteResult.summaryText}
• Capacity: Feeds ~${verifiedQuoteResult.feedsGuestCapacity} guests
• Total Amount: £${verifiedQuoteResult.totalAmount.toFixed(2)}
• Cost Per Guest: ~£${verifiedQuoteResult.costPerGuest?.toFixed(2)} per person
• Delivery: £${verifiedQuoteResult.deliveryFee.toFixed(2)} (${verifiedQuoteResult.deliveryZoneNote})
• Ready-to-Send Formatted WhatsApp Breakdown:
${verifiedQuoteResult.smartReceiptCard}
`;
        }
      } else if (orderMode === 'FEAST_PACKAGE' || userWantsFeast) {
        const pkgId = state.selectedPackageId || (userText.includes('classic') ? 'PKG-SILVER' : 'PKG-GOLD');
        const quoteGuests = effectiveGuests > 0 ? effectiveGuests : 20;
        verifiedQuoteResult = billingEngine.calculateFeastPackage({
          packageIdOrName: pkgId,
          guestCount: quoteGuests,
          postcode: effectiveLocation,
        });
        verifiedCalculationContext = `
DETERMINISTIC BILLING ENGINE VERIFIED QUOTE:
• Mode: Feast Buffet Package (${verifiedQuoteResult.packageName})
• Guest Count: ${verifiedQuoteResult.guestCount} guests
• Per Person Rate: £${verifiedQuoteResult.perPersonRate?.toFixed(2)}
• Total Amount: £${verifiedQuoteResult.totalAmount.toFixed(2)}
• Cost Per Guest: £${verifiedQuoteResult.costPerGuest?.toFixed(2)} per person
• Delivery: ${verifiedQuoteResult.deliveryZoneNote}
• Ready-to-Send Formatted WhatsApp Breakdown:
${verifiedQuoteResult.smartReceiptCard}
`;
      }
    }

    const isMenuInquiry =
      userText.includes('menu') ||
      userText.includes('dish') ||
      userText.includes('option') ||
      userText.includes('include') ||
      userText.includes('food') ||
      userText.includes('item') ||
      userText.includes('list') ||
      userText.includes('spread') ||
      userText.includes('what do you have');

    // Anti-Repetition Check: Determine if Host Protection advice was already delivered in conversation history
    const historyText = (state.conversationHistory || []).join(' ').toLowerCase();
    const alreadyDeliveredStealth = historyText.includes('paneer') && (historyText.includes('cushion') || historyText.includes('tuck into'));
    const alreadyDeliveredWarning = historyText.includes('short') && historyText.includes('trays');
    const alreadyDeliveredSpice = historyText.includes('mild and buttery') || historyText.includes('mint chutney');

    // Deterministic Host Protection Audit
    let hostProtectionAudit: HostProtectionAudit | null = null;
    let hostProtectionPromptContext = 'Portion and dietary balance are optimal.';

    if (hostProtectionService) {
      const auditItems =
        verifiedQuoteResult?.items?.map((i) => ({ dishName: i.dishName, quantity: i.quantity })) ||
        (extractedDishes.length > 0 ? extractedDishes.map((d) => ({ dishName: d.dishQuery, quantity: d.quantity })) : undefined);

      hostProtectionAudit = hostProtectionService.auditOrder({
        guestCount: effectiveGuests,
        orderMode,
        items: auditItems,
        packageId: state.selectedPackageId,
        dietaryPreference: effectiveDiet,
        userMessage: rawMsg,
      });

      if (isMenuInquiry) {
        hostProtectionPromptContext = 'Client is asking for the menu/dish list. Focus 100% on delivering the full dish spread and course selections. DO NOT inject paneer cushion tips or portion warnings right now.';
      } else if (hostProtectionAudit && hostProtectionAudit.trapType !== 'NONE') {
        const isRepeated =
          (hostProtectionAudit.trapType === 'STEALTH_MEAT_EATER' && alreadyDeliveredStealth) ||
          (hostProtectionAudit.trapType === 'UNDER_ORDERING' && alreadyDeliveredWarning) ||
          (hostProtectionAudit.trapType === 'SPICE_SENSITIVITY' && alreadyDeliveredSpice);

        if (!isRepeated) {
          hostProtectionPromptContext = `
HOST PROTECTION INSTINCT (ACTIVE):
• Trap Detected: ${hostProtectionAudit.headline} (Severity: ${hostProtectionAudit.severity})
• Catering Advice to the Host: ${hostProtectionAudit.adviceText}
${hostProtectionAudit.formattedBubbleAdvice ? `• Recommended Natural Phrasing for Bubble 1 or 2:\n"${hostProtectionAudit.formattedBubbleAdvice}"` : ''}
`;
        } else {
          hostProtectionPromptContext = 'Host protection advice was already delivered previously in this conversation. Do not repeat it.';
        }
      }
    }

    const menuCatalogContext = `
AUTHENTIC DIL SE CATERING DISH CATALOG (WHEN CLIENT ASKS FOR MENU OR DISHES, ALWAYS LIST THESE EXACT CHOICES):
👑 DIL SE CLASSIC FEAST SPREAD (£14.50/person - Min 15 guests):
  • Starters (Choice of 2): Amritsari Fish Tikka (Halal), Tandoori Murgh Tikka (Halal), Punjabi Samosa Platter (Veg)
  • Mains (Choice of 2): Old Delhi Butter Chicken (Halal), Shahi Kadhai Paneer (Veg)
  • Dal (Included): Slow-Cooked Dal Makhani
  • Rice (Included): Awadhi Chicken Dum Biryani or Subz Nizami Veg Biryani
  • Bread (Included): Fresh Tandoori Butter Naan
  • Dessert (Included): Warm Gulab Jamun with Kesari Rabdi
  (Includes buffet warmers, luxury chaffing dishes, and cutlery setup)

👑 DIL SE ROYAL CELEBRATION FEAST (£18.00/person - Min 20 guests):
  • Starters (Choice of 3): Amritsari Fish Tikka, Tandoori Murgh Tikka, Punjabi Samosa Platter
  • Mains (Choice of 3): Old Delhi Butter Chicken, Shahi Kadhai Paneer, Kashmiri Rogan Josh Lamb (Halal)
  • Dal (Included): Slow-Cooked Dal Makhani
  • Rice (Included): Awadhi Chicken Dum Biryani or Subz Nizami Veg Biryani
  • Breads (Choice of 2): Tandoori Butter Naan, Crisp Laccha Paratha
  • Desserts (Choice of 2): Warm Gulab Jamun, Rasmalai with Pistachio Dust

🥘 POPULAR BULK PARTY TRAYS (Generously serves ~10 guests each):
  • Awadhi Chicken Dum Biryani: £55 | Subz Nizami Veg Biryani: £45
  • Old Delhi Butter Chicken: £60 | Shahi Kadhai Paneer: £50 | Kashmiri Rogan Josh Lamb: £70
  • Slow-Cooked Dal Makhani: £40 | Amritsari Fish Tikka: £42
  • Fresh Tandoori Butter Naan (Pack of 10): £14
  • Warm Gulab Jamun (Tray of 20): £28 | Rasmalai with Pistachio: £32
`;

    const historySnippet = (state.conversationHistory || [])
      .slice(-6)
      .map((turn, idx) => `${idx + 1}. ${turn}`)
      .join('\n');

    const promptContext = `
HOST PROTECTION & SOCIAL EMBARRASSMENT RADAR:
${hostProtectionPromptContext}

VERIFIED BILLING CALCULATION (100% DETERMINISTIC - IF QUOTING, USE THESE EXACT NUMBERS):
${verifiedCalculationContext}

${menuCatalogContext}

CURRENT COLLECTED STATE:
• Customer Phone: ${state.phoneNumber}
• Customer Name: ${state.customerName || 'Unknown'}
• Current Stage: ${state.currentStage}
• Order Mode: ${orderMode}
• Event Type: ${state.eventType || 'Not specified'}
• Event Date: ${state.eventDate || 'Not specified'}
• Serving Time: ${state.servingTime || 'Not specified'}
• Guest Count: ${effectiveGuests || 'Not specified'}
• Location: ${effectiveLocation || 'Not specified'}
• Dietary Preference: ${effectiveDiet || 'Not specified'}
• Selected Package: ${state.selectedPackageId || 'None'}
• Already Confirmed: ${state.isConfirmed}

RECENT CONVERSATION HISTORY (DO NOT REPEAT TIPS OR QUESTIONS ALREADY GIVEN):
${historySnippet || 'No prior turns.'}

LATEST USER MESSAGE:
"${rawMsg}"
`;

    let replyText = '';
    let splitBubbles: string[] = [];
    let buttons: { id: string; title: string }[] = [];
    let updatedSlots = {
      ...state,
      orderMode,
      guestCount: effectiveGuests || state.guestCount,
      deliveryLocation: effectiveLocation || state.deliveryLocation,
      dietaryPreference: effectiveDiet || state.dietaryPreference,
    };
    let isConfirmed = state.isConfirmed;
    let requiresHandoff = state.humanHandoffRequired;
    let handoffReason = state.handoffReason;

    if (llm) {
      try {
        const response = await llm.invoke([
          new SystemMessage(SYSTEM_PROMPT),
          new HumanMessage(promptContext),
        ]);

        const rawContent = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
        const cleanedJson = rawContent.replace(/```json\n?|\n?```/g, '').trim();
        const parsed: ModelOutputJson = JSON.parse(cleanedJson);

        const rawBubbles =
          parsed.splitBubbles && parsed.splitBubbles.length > 0
            ? parsed.splitBubbles
            : parsed.replyMessage
              ? [parsed.replyMessage]
              : [];

        // Programmatically strip any "Bubble 1:", "Bubble 2:", "Message 1:" prefix labels
        splitBubbles = rawBubbles
          .map(sanitizeBubbleText)
          .filter(Boolean);

        // Only inject host protection if it was NOT already communicated to the user, and user is not explicitly asking for the menu
        if (hostProtectionAudit && hostProtectionAudit.formattedBubbleAdvice && !isMenuInquiry) {
          const combined = splitBubbles.join(' ').toLowerCase();

          if (hostProtectionAudit.trapType === 'UNDER_ORDERING' && !alreadyDeliveredWarning) {
            const mentionsWarning =
              combined.includes('short') ||
              combined.includes('only feed') ||
              combined.includes('extra tray') ||
              combined.includes('heads up');
            if (!mentionsWarning && splitBubbles.length > 0) {
              splitBubbles[0] = `${splitBubbles[0]}\n\n${hostProtectionAudit.formattedBubbleAdvice}`;
            }
          } else if (hostProtectionAudit.trapType === 'STEALTH_MEAT_EATER' && !alreadyDeliveredStealth) {
            const mentionsPaneer =
              combined.includes('cushion') ||
              combined.includes('vegetarian cushion') ||
              combined.includes('tuck into the paneer') ||
              combined.includes('tuck into');
            if (!mentionsPaneer && splitBubbles.length > 0) {
              splitBubbles[0] = `${splitBubbles[0]}\n\n${hostProtectionAudit.formattedBubbleAdvice}`;
            }
          } else if (hostProtectionAudit.trapType === 'SPICE_SENSITIVITY' && !alreadyDeliveredSpice) {
            const mentionsSpice =
              combined.includes('mild') ||
              combined.includes('spice') ||
              combined.includes('chutney') ||
              combined.includes('rich');
            if (!mentionsSpice && splitBubbles.length > 0) {
              splitBubbles[0] = `${splitBubbles[0]}\n\n${hostProtectionAudit.formattedBubbleAdvice}`;
            }
          }
        }

        // Robust Anti-Hallucination Menu Delivery Guard
        const combined = splitBubbles.join(' ').toLowerCase();
        const distinctDishMatches = [
          'butter chicken',
          'amritsari fish',
          'murgh tikka',
          'shahi kadhai paneer',
          'kadhai paneer',
          'dal makhani',
          'dum biryani',
          'veg biryani',
          'chicken biryani',
          'tandoori naan',
          'butter naan',
          'gulab jamun',
          'rasmalai',
          'rogan josh',
          'samosa platter',
          'punjabi samosa',
        ].filter((dish) => combined.includes(dish));

        const hasCourseHeadings =
          (combined.includes('starter') || combined.includes('starters')) &&
          (combined.includes('main') || combined.includes('mains'));

        const hasConcreteDishes = distinctDishMatches.length >= 2 || hasCourseHeadings;

        const promisesMenuWithoutContent =
          (combined.includes("here's the menu") ||
            combined.includes('here is the menu') ||
            combined.includes('delighted to share the menu') ||
            combined.includes('share the menu with you') ||
            combined.includes("what's included in") ||
            combined.includes('menu for your')) &&
          !hasConcreteDishes;

        if ((isMenuInquiry && !hasConcreteDishes) || promisesMenuWithoutContent) {
          const concreteMenuCard =
            orderMode === 'A_LA_CARTE_TRAYS'
              ? `🥘 *Our Popular Bulk Party Trays (Feeds ~10 each):*\n• Awadhi Chicken Dum Biryani: £55\n• Old Delhi Butter Chicken: £60\n• Shahi Kadhai Paneer: £50\n• Slow-Cooked Dal Makhani: £40\n• Amritsari Fish Tikka: £42\n• Fresh Tandoori Butter Naan: £14 (Pack of 10)\n• Warm Gulab Jamun: £28`
              : `👑 *Dil Se Classic Feast Spread (£14.50/person):*\n• *Starters*: Amritsari Fish Tikka & Punjabi Samosas\n• *Mains*: Old Delhi Butter Chicken & Shahi Kadhai Paneer\n• *Dal*: Slow-Cooked Dal Makhani\n• *Rice*: Awadhi Chicken Dum Biryani\n• *Bread*: Fresh Tandoori Butter Naan\n• *Dessert*: Warm Gulab Jamun\n*(Buffet warmers, chaffing dishes & cutlery setup included)*`;

          splitBubbles = [
            `Here is the delicious menu spread for your celebration! 🍽️`,
            `${concreteMenuCard}\n\nWhich of these dishes appeal most to your guests?`,
          ];
          buttons = [
            { id: 'btn_classic', title: '👑 Classic Feast' },
            { id: 'btn_trays', title: '🥘 Party Trays' },
            { id: 'btn_human', title: '💬 Customise Dishes' },
          ];
        }

        replyText = splitBubbles.join('\n\n') || parsed.replyMessage || '';
        replyText = sanitizeBubbleText(replyText);
        buttons = (parsed.suggestedButtons && parsed.suggestedButtons.length > 0) ? parsed.suggestedButtons.slice(0, 3) : buttons;

        if (parsed.extractedSlots) {
          orderMode = (parsed.extractedSlots.orderMode as any) || orderMode;
          updatedSlots = {
            ...updatedSlots,
            orderMode,
            eventType: parsed.extractedSlots.eventType || state.eventType,
            eventDate: parsed.extractedSlots.eventDate || state.eventDate,
            servingTime: parsed.extractedSlots.servingTime || state.servingTime,
            guestCount: parsed.extractedSlots.guestCount || updatedSlots.guestCount,
            deliveryLocation: parsed.extractedSlots.deliveryLocation || updatedSlots.deliveryLocation,
            dietaryPreference: parsed.extractedSlots.dietaryPreference || updatedSlots.dietaryPreference,
            selectedPackageId: parsed.extractedSlots.selectedPackageId || state.selectedPackageId,
            estimatedTotal:
              parsed.extractedSlots.estimatedTotal != null && Number(parsed.extractedSlots.estimatedTotal) > 0
                ? Number(parsed.extractedSlots.estimatedTotal)
                : state.estimatedTotal,
          };
        }

        if (parsed.isConfirmed) {
          isConfirmed = true;
        }
        if (parsed.requiresHandoff) {
          requiresHandoff = true;
          handoffReason = parsed.handoffReason || 'User requested escalation';
        }
      } catch (err: unknown) {
        const error = err as Error;
        logger.error(`LLM invocation error: ${error.message}. Engaging enterprise deterministic fallback engine.`);
        const fallback = buildDeterministicFallback({
          verifiedQuoteResult,
          hostProtectionAudit,
          effectiveGuests,
          effectiveLocation,
          orderMode,
          userText,
        });
        splitBubbles = fallback.splitBubbles;
        replyText = splitBubbles.join('\n\n');
        buttons = fallback.buttons;
      }
    } else {
      // Deterministic rule-based fallback when LLM API key is not configured
      const fallback = buildDeterministicFallback({
        verifiedQuoteResult,
        hostProtectionAudit,
        effectiveGuests,
        effectiveLocation,
        orderMode,
        userText,
      });
      splitBubbles = fallback.splitBubbles;
      replyText = splitBubbles.join('\n\n');
      buttons = fallback.buttons;
    }

    // Deterministic Calculation & Business Logic
    let calculatedTotal = verifiedQuoteResult?.totalAmount || updatedSlots.estimatedTotal || state.estimatedTotal;
    if (orderMode === 'FEAST_PACKAGE' && updatedSlots.selectedPackageId && updatedSlots.guestCount >= 15 && !verifiedQuoteResult) {
      const selectedPkg = menuCacheService.getPackageById(updatedSlots.selectedPackageId);
      if (selectedPkg) {
        calculatedTotal = selectedPkg.perPersonPrice * updatedSlots.guestCount;
      }
    }

    // If confirmed, persist to Enterprise Database and sync to Airtable
    if (isConfirmed && !state.isConfirmed) {
      logger.log(`Customer ${state.phoneNumber} confirmed order! Committing to Enterprise Database...`);

      if (databaseService) {
        try {
          const dbCust = await databaseService.findOrCreateCustomer(
            state.customerName || 'WhatsApp Customer',
            state.phoneNumber,
            updatedSlots.deliveryLocation,
          );

          const dbEvent = await databaseService.createEvent({
            customerId: dbCust.id,
            eventType: updatedSlots.eventType || (orderMode === 'FEAST_PACKAGE' ? 'Buffet Catering' : 'Party Trays Order'),
            eventDate: updatedSlots.eventDate || new Date().toISOString().split('T')[0],
            guestCount: updatedSlots.guestCount || (orderMode === 'FEAST_PACKAGE' ? 20 : 10),
            deliveryAddress: updatedSlots.deliveryLocation || 'London',
            dietaryPreference: updatedSlots.dietaryPreference || 'Mixed',
            status: 'CONFIRMED',
          });

          await databaseService.createOrder({
            customerId: dbCust.id,
            eventId: dbEvent.id,
            orderMode: orderMode as 'FEAST_PACKAGE' | 'A_LA_CARTE_TRAYS',
            selectedPackageId: updatedSlots.selectedPackageId || undefined,
            totalAmount: calculatedTotal || 250,
            itemsSummary: `Mode: ${orderMode} | Selection: ${updatedSlots.selectedPackageId || 'Bulk Trays'}`,
          });
          logger.log(`✅ [DB_SUCCESS] Relational order & event committed to enterprise database.`);
        } catch (dbErr: unknown) {
          logger.error(`Enterprise database write error: ${(dbErr as Error).message}`);
        }
      }

      // Optional secondary sync to Airtable (resilient, non-blocking)
      if (airtableService) {
        try {
          const customer = await airtableService.findOrCreateCustomer(
            state.customerName || 'WhatsApp Customer',
            state.phoneNumber,
            updatedSlots.deliveryLocation,
          );

          const event = await airtableService.createEvent({
            customerId: customer.id || state.phoneNumber,
            eventType: updatedSlots.eventType || (orderMode === 'FEAST_PACKAGE' ? 'Buffet Catering' : 'Party Trays Order'),
            eventDate: updatedSlots.eventDate || new Date().toISOString(),
            guestCount: updatedSlots.guestCount || (orderMode === 'FEAST_PACKAGE' ? 20 : 10),
            deliveryAddress: updatedSlots.deliveryLocation || 'London',
            dietarySplit: updatedSlots.dietaryPreference || 'Mixed',
            status: 'Quoted',
          });

          await airtableService.createOrder({
            customerId: customer.id || state.phoneNumber,
            eventId: event.id || 'EVT-001',
            orderStatus: 'Confirmed',
            estimatedTotal: calculatedTotal || 250,
            itemsSummary: `Mode: ${orderMode} | Selection: ${updatedSlots.selectedPackageId || 'Bulk Trays'}`,
          });
          logger.log(`✅ [AIRTABLE_SYNC] Synced booking to Airtable.`);
        } catch (atErr: unknown) {
          logger.warn(`Secondary Airtable sync skipped or failed: ${(atErr as Error).message}`);
        }
      }

      replyText += '\n\n🎉 *Order Confirmed!* Your booking has been locked in our system. Our catering manager will contact you shortly to coordinate serving logistics.';
      splitBubbles.push('🎉 *Order Confirmed!* Your booking has been locked in our system. Our catering manager will contact you shortly to coordinate serving logistics.');
      buttons = [{ id: 'btn_support', title: '💬 Contact Team' }];
    }

    // If Human handoff triggered, record in Enterprise SQL Database
    if (requiresHandoff && !state.humanHandoffRequired) {
      if (databaseService) {
        await databaseService.recordHumanHandoff(state.phoneNumber, handoffReason || 'Customer requested escalation');
      }
      if (airtableService) {
        try {
          await airtableService.markHumanHandoffRequired(state.phoneNumber, handoffReason || 'Customer requested escalation');
        } catch {
          // non-blocking
        }
      }
    }

    return {
      currentStage: isConfirmed ? 'COMPLETED' : 'IN_PROGRESS',
      orderMode,
      eventType: updatedSlots.eventType,
      eventDate: updatedSlots.eventDate,
      servingTime: updatedSlots.servingTime,
      guestCount: updatedSlots.guestCount,
      deliveryLocation: updatedSlots.deliveryLocation,
      dietaryPreference: updatedSlots.dietaryPreference,
      selectedPackageId: updatedSlots.selectedPackageId,
      estimatedTotal: calculatedTotal,
      isConfirmed,
      humanHandoffRequired: requiresHandoff,
      handoffReason,
      replyMessage: replyText,
      splitBubbles,
      interactiveButtons: buttons,
      conversationHistory: [
        `Client: ${rawMsg}`,
        `Kabir: ${splitBubbles.join(' | ')}`,
      ],
    };
  };

  const workflow = new StateGraph(CateringStateAnnotation)
    .addNode('assistant', assistantNode)
    .addEdge('__start__', 'assistant')
    .addEdge('assistant', '__end__');

  return workflow.compile({ checkpointer: memorySaver });
}
