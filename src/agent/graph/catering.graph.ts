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
      .slice(0, 12)
      .map((m) => `• [${m.id}] ${m.name} (${m.category}, ${m.dietary.join('/')}) - £${m.unitPrice}/person`)
      .join('\n');

    const promptContext = `
ACTIVE MENU & PACKAGES (SOURCE OF TRUTH):
--- PACKAGES ---
${packagesContext}

--- POPULAR DISHES ---
${menuContext}

CURRENT COLLECTED STATE:
• Customer Phone: ${state.phoneNumber}
• Customer Name: ${state.customerName || 'Unknown'}
• Current Stage: ${state.currentStage}
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

    if (llm) {
      try {
        const response = await llm.invoke([
          new SystemMessage(SYSTEM_PROMPT),
          new HumanMessage(promptContext),
        ]);

        const rawContent = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
        // Clean JSON if enclosed in markdown backticks
        const cleanedJson = rawContent.replace(/```json\n?|\n?```/g, '').trim();
        const parsed: ModelOutputJson = JSON.parse(cleanedJson);

        replyText = parsed.replyMessage;
        buttons = (parsed.suggestedButtons || []).slice(0, 3);

        if (parsed.extractedSlots) {
          updatedSlots = {
            ...updatedSlots,
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
          'Namaste! Welcome to Dil Se Catering ❤️ How can we help make your upcoming event delicious and memorable? Could you share the date, number of guests, and event location?';
        buttons = [
          { id: 'btn_menu', title: '📋 Explore Menu' },
          { id: 'btn_package', title: '👑 Royal Feast' },
          { id: 'btn_human', title: '💬 Speak to Chef' },
        ];
      }
    } else {
      // Deterministic rule-based fallback when LLM API key is not yet configured in .env
      const msg = state.lastUserMessage.toLowerCase();
      if (msg.includes('hi') || msg.includes('hello') || msg.includes('namaste')) {
        replyText =
          'Namaste! Welcome to Dil Se Catering ❤️ Food prepared with pure love for your special occasions. Are you planning an event like a birthday, wedding, or office gathering?';
        buttons = [
          { id: 'btn_event', title: '🎉 Plan Catering' },
          { id: 'btn_menu', title: '📋 View Menu' },
          { id: 'btn_human', title: '📞 Talk to Team' },
        ];
      } else if (msg.includes('menu') || msg.includes('dishes') || msg.includes('food')) {
        replyText =
          'Here are our most beloved packages:\n• Dil Se Classic Feast: £14.50/head (Starters, 2 Mains, Dal Makhani, Dum Biryani, Naan & Gulab Jamun)\n• Royal Celebration Feast: £18.00/head\n\nHow many guests are you expecting?';
        buttons = [
          { id: 'pkg_classic', title: 'Classic (£14.50)' },
          { id: 'pkg_royal', title: 'Royal (£18.00)' },
        ];
      } else {
        replyText =
          'Thank you for your message! To help us create the perfect quote for you, please let us know:\n1. Event Date\n2. Guest Count (Min 15 pax)\n3. Location / Postcode\n4. Food Preference (Veg, Non-Veg, or Mixed)';
        buttons = [
          { id: 'btn_veg', title: '🥗 Vegetarian' },
          { id: 'btn_nonveg', title: '🍗 Non-Veg' },
          { id: 'btn_mixed', title: '✨ Mixed Menu' },
        ];
      }
    }

    // Deterministic Calculation & Business Logic
    let calculatedTotal = state.estimatedTotal;
    if (updatedSlots.selectedPackageId && updatedSlots.guestCount >= 15) {
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
        eventType: updatedSlots.eventType || 'Catering Event',
        eventDate: updatedSlots.eventDate || new Date().toISOString(),
        guestCount: updatedSlots.guestCount || 20,
        deliveryAddress: updatedSlots.deliveryLocation || 'London',
        dietarySplit: updatedSlots.dietaryPreference || 'Mixed',
        status: 'Quoted',
      });

      await airtableService.createOrder({
        customerId: customer.id || state.phoneNumber,
        eventId: event.id || 'EVT-001',
        orderStatus: 'Confirmed',
        estimatedTotal: calculatedTotal || 350,
        itemsSummary: `Package: ${updatedSlots.selectedPackageId || 'Custom'} for ${updatedSlots.guestCount} guests`,
      });

      replyText += '\n\n🎉 *Order Confirmed!* Your catering booking has been locked in our system. Our catering manager will contact you shortly to coordinate serving logistics.';
      buttons = [{ id: 'btn_support', title: '💬 Contact Team' }];
    }

    // If Human handoff triggered
    if (requiresHandoff && !state.humanHandoffRequired) {
      await airtableService.markHumanHandoffRequired(state.phoneNumber, handoffReason || 'Customer request');
    }

    return {
      currentStage: isConfirmed ? 'COMPLETED' : 'IN_PROGRESS',
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
