import { StateGraph, MemorySaver } from '@langchain/langgraph';
import { Logger } from '@nestjs/common';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { CateringStateAnnotation, CateringStateType, CateringStateUpdate } from './catering.state.js';
import { MenuCacheService } from '../../airtable/menu-cache.service.js';
import { AirtableService } from '../../airtable/airtable.service.js';
import { SYSTEM_PROMPT } from '../prompts/system.prompt.js';

interface ModelOutputJson {
  thought?: string;
  replyMessage: string;
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
  };
  isConfirmed?: boolean;
  requiresHandoff?: boolean;
  handoffReason?: string;
}

export function buildCateringGraph(
  llm: BaseChatModel | null,
  menuCacheService: MenuCacheService,
  airtableService: AirtableService,
) {
  const logger = new Logger('CateringGraph');
  const memorySaver = new MemorySaver();

  const assistantNode = async (state: CateringStateType): Promise<CateringStateUpdate> => {
    logger.log(`Processing state for phone ${state.phoneNumber}. Stage: ${state.currentStage}`);

    const packages = menuCacheService.getPackages();
    const menuItems = menuCacheService.getMenuItems();

    const packagesContext = packages
      .map(
        (p) =>
          `• [${p.id}] ${p.name} (£${p.perPersonPrice}/person, min ${p.minGuests} guests): ${p.description}`,
      )
      .join('\n');

    const menuContext = menuItems
      .map(
        (m) =>
          `• [${m.id}] ${m.name} (${m.category}, ${m.dietary.join('/')}) - Per-Head: £${m.perPersonPrice} | Party Tray (serves 10): £${m.trayPrice}`,
      )
      .join('\n');

    const promptContext = `
ACTIVE MENU & DUAL PRICING (SOURCE OF TRUTH):
--- CURATED FEAST PACKAGES (Per Person) ---
${packagesContext}

--- A LA CARTE DISHES & PARTY TRAYS ---
${menuContext}

CURRENT COLLECTED STATE:
• Customer Phone: ${state.phoneNumber}
• Customer Name: ${state.customerName || 'Unknown'}
• Current Stage: ${state.currentStage}
• Order Mode: ${state.orderMode || 'Not chosen'}
• Event Type: ${state.eventType || 'Not specified'}
• Event Date: ${state.eventDate || 'Not specified'}
• Serving Time: ${state.servingTime || 'Not specified'}
• Guest Count: ${state.guestCount || 'Not specified'}
• Location: ${state.deliveryLocation || 'Not specified'}
• Dietary Preference: ${state.dietaryPreference || 'Not specified'}
• Selected Package: ${state.selectedPackageId || 'None'}
• Already Confirmed: ${state.isConfirmed}

LATEST USER MESSAGE:
"${state.lastUserMessage}"
`;

    let replyText = '';
    let buttons: { id: string; title: string }[] = [];
    let updatedSlots = state;
    let isConfirmed = state.isConfirmed;
    let requiresHandoff = state.humanHandoffRequired;
    let handoffReason = state.handoffReason;
    let orderMode = state.orderMode || 'FEAST_PACKAGE';

    if (llm) {
      try {
        const response = await llm.invoke([
          new SystemMessage(SYSTEM_PROMPT),
          new HumanMessage(promptContext),
        ]);

        const rawContent = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
        const cleanedJson = rawContent.replace(/```json\n?|\n?```/g, '').trim();
        const parsed: ModelOutputJson = JSON.parse(cleanedJson);

        replyText = parsed.replyMessage;
        buttons = (parsed.suggestedButtons || []).slice(0, 3);

        if (parsed.extractedSlots) {
          orderMode = parsed.extractedSlots.orderMode || orderMode;
          updatedSlots = {
            ...updatedSlots,
            orderMode,
            eventType: parsed.extractedSlots.eventType || state.eventType,
            eventDate: parsed.extractedSlots.eventDate || state.eventDate,
            servingTime: parsed.extractedSlots.servingTime || state.servingTime,
            guestCount: parsed.extractedSlots.guestCount || state.guestCount,
            deliveryLocation: parsed.extractedSlots.deliveryLocation || state.deliveryLocation,
            dietaryPreference: parsed.extractedSlots.dietaryPreference || state.dietaryPreference,
            selectedPackageId: parsed.extractedSlots.selectedPackageId || state.selectedPackageId,
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
        logger.error(`LLM invocation error: ${error.message}. Triggering graceful fallback handler.`);
        replyText =
          'Namaste! Welcome to Dil Se Catering ❤️ Are you planning a Complete Feast Buffet (per person) or ordering individual Party Trays (bulk dishes)?';
        buttons = [
          { id: 'btn_feast', title: '👑 Complete Feast' },
          { id: 'btn_trays', title: '🥘 Party Trays' },
          { id: 'btn_human', title: '💬 Speak to Chef' },
        ];
      }
    } else {
      // Deterministic rule-based fallback when LLM API key is not yet configured in .env
      const msg = state.lastUserMessage.toLowerCase();
      if (msg.includes('tray') || msg.includes('bulk') || msg.includes('dish') || msg.includes('plate')) {
        orderMode = 'A_LA_CARTE_TRAYS';
        replyText =
          'Perfect! Here are our most popular bulk Party Trays (each tray generously serves ~10 guests):\n• Awadhi Chicken Dum Biryani: £55/tray\n• Old Delhi Butter Chicken: £60/tray\n• Shahi Kadhai Paneer: £50/tray\n• Slow-Cooked Dal Makhani: £40/tray\n• Amritsari Fish Tikka: £42/tray\n• Fresh Tandoori Naan: £14 (pack of 10)\n\nWhich dishes and how many trays would you like?';
        buttons = [
          { id: 'tray_biryani', title: '🍗 Biryani Tray' },
          { id: 'tray_butterchicken', title: '🍛 Butter Chicken' },
          { id: 'tray_paneer', title: '🧀 Paneer Tray' },
        ];
      } else if (msg.includes('feast') || msg.includes('package') || msg.includes('buffet') || msg.includes('menu')) {
        orderMode = 'FEAST_PACKAGE';
        replyText =
          'Here are our Royal Feast Packages (complete per-person buffet spread):\n• 👑 Dil Se Classic Feast: £14.50/person (2 Starters, 2 Mains, Dal, Biryani, Naan & Gulab Jamun)\n• 👑 Royal Celebration Feast: £18.00/person (3 Starters, 3 Mains, Dal, Biryani, 2 Breads, 2 Desserts)\n\nApproximately how many guests are you expecting?';
        buttons = [
          { id: 'pkg_classic', title: 'Classic (£14.50)' },
          { id: 'pkg_royal', title: 'Royal (£18.00)' },
        ];
      } else if (msg.includes('hi') || msg.includes('hello') || msg.includes('namaste')) {
        replyText =
          'Namaste! Welcome to Dil Se Catering ❤️ Food prepared with pure love for your celebrations. Are you looking for a Complete Feast (per person buffet) or individual Party Trays?';
        buttons = [
          { id: 'btn_feast', title: '👑 Complete Feast' },
          { id: 'btn_trays', title: '🥘 Party Trays' },
          { id: 'btn_human', title: '📞 Talk to Team' },
        ];
      } else {
        replyText =
          'Thank you for your message! To help us prepare the best catering quote, please let us know your Event Date, Location, and whether you prefer our Complete Feast or Bulk Party Trays.';
        buttons = [
          { id: 'btn_feast', title: '👑 Complete Feast' },
          { id: 'btn_trays', title: '🥘 Party Trays' },
        ];
      }
    }

    // Deterministic Calculation & Business Logic
    let calculatedTotal = state.estimatedTotal;
    if (orderMode === 'FEAST_PACKAGE' && updatedSlots.selectedPackageId && updatedSlots.guestCount >= 15) {
      const selectedPkg = menuCacheService.getPackageById(updatedSlots.selectedPackageId);
      if (selectedPkg) {
        calculatedTotal = selectedPkg.perPersonPrice * updatedSlots.guestCount;
      }
    }

    // If confirmed, persist to Airtable
    if (isConfirmed && !state.isConfirmed) {
      logger.log(`Customer ${state.phoneNumber} confirmed order! Committing to Airtable...`);
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

      replyText += '\n\n🎉 *Order Confirmed!* Your booking has been locked in our system. Our catering manager will contact you shortly to coordinate serving logistics.';
      buttons = [{ id: 'btn_support', title: '💬 Contact Team' }];
    }

    // If Human handoff triggered
    if (requiresHandoff && !state.humanHandoffRequired) {
      await airtableService.markHumanHandoffRequired(state.phoneNumber, handoffReason || 'Customer request');
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
      interactiveButtons: buttons,
    };
  };

  const workflow = new StateGraph(CateringStateAnnotation)
    .addNode('assistant', assistantNode)
    .addEdge('__start__', 'assistant')
    .addEdge('assistant', '__end__');

  return workflow.compile({ checkpointer: memorySaver });
}
