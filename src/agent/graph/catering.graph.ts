import { StateGraph, MemorySaver } from '@langchain/langgraph';
import { Logger } from '@nestjs/common';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { CateringStateAnnotation, CateringStateType, CateringStateUpdate } from './catering.state.js';
import { MenuCacheService } from '../../airtable/menu-cache.service.js';
import { AirtableService } from '../../airtable/airtable.service.js';
import { DatabaseService } from '../../database/database.service.js';
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
  };
  isConfirmed?: boolean;
  requiresHandoff?: boolean;
  handoffReason?: string;
}

export function buildCateringGraph(
  llm: BaseChatModel | null,
  menuCacheService: MenuCacheService,
  airtableService: AirtableService,
  databaseService?: DatabaseService,
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
    let splitBubbles: string[] = [];
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

        const rawBubbles = parsed.splitBubbles && parsed.splitBubbles.length > 0
          ? parsed.splitBubbles
          : (parsed.replyMessage ? [parsed.replyMessage] : []);

        // Programmatically strip any "Bubble 1:", "Bubble 2:", "Message 1:" prefix labels
        splitBubbles = rawBubbles
          .map((b) => b.replace(/^(?:bubble|message|part)\s*\d+\s*[:\-]\s*/i, '').trim())
          .filter(Boolean);

        replyText = splitBubbles.join('\n\n') || parsed.replyMessage || '';
        replyText = replyText.replace(/(?:^|\n)(?:bubble|message|part)\s*\d+\s*[:\-]\s*/gi, '').trim();

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
        splitBubbles = [
          'Namaste! Welcome to Dil Se Catering ❤️ Food prepared with pure love for your celebrations.',
          'Are you looking for our complete per-person Feast Buffet, or individual bulk Party Trays?',
        ];
        replyText = splitBubbles.join('\n\n');
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
        splitBubbles = [
          'Spot on! Here are our most popular bulk Party Trays (each tray generously feeds ~10 guests):\n• Awadhi Chicken Dum Biryani: £55\n• Old Delhi Butter Chicken: £60\n• Shahi Kadhai Paneer: £50\n• Slow-Cooked Dal Makhani: £40\n• Amritsari Fish Tikka: £42\n• Fresh Tandoori Naan: £14 (pack of 10)',
          'Which dishes and how many trays would you like to arrange?',
        ];
        replyText = splitBubbles.join('\n\n');
        buttons = [
          { id: 'tray_biryani', title: '🍗 Biryani Tray' },
          { id: 'tray_butterchicken', title: '🍛 Butter Chicken' },
          { id: 'tray_paneer', title: '🧀 Paneer Tray' },
        ];
      } else if (msg.includes('feast') || msg.includes('package') || msg.includes('buffet') || msg.includes('menu')) {
        orderMode = 'FEAST_PACKAGE';
        splitBubbles = [
          'Lovely choice! Here are our curated Royal Feast spreads:\n• 👑 Dil Se Classic Feast: £14.50/person\n• 👑 Royal Celebration Feast: £18.00/person\n• 💼 Executive Buffet: £13.00/person',
          'Approximately how many guests are you expecting?',
        ];
        replyText = splitBubbles.join('\n\n');
        buttons = [
          { id: 'pkg_classic', title: 'Classic (£14.50)' },
          { id: 'pkg_royal', title: 'Royal (£18.00)' },
        ];
      } else if (msg.includes('hi') || msg.includes('hello') || msg.includes('namaste')) {
        splitBubbles = [
          'Namaste! Welcome to Dil Se Catering ❤️ Food prepared with pure love for your celebrations.',
          'Are you looking for a Complete Feast (per person buffet) or individual Party Trays?',
        ];
        replyText = splitBubbles.join('\n\n');
        buttons = [
          { id: 'btn_feast', title: '👑 Complete Feast' },
          { id: 'btn_trays', title: '🥘 Party Trays' },
          { id: 'btn_human', title: '📞 Talk to Team' },
        ];
      } else {
        splitBubbles = [
          'Thank you for reaching out to Dil Se Catering ❤️',
          'To help us prepare the best catering quote, what is your event date, postcode, and preferred catering style?',
        ];
        replyText = splitBubbles.join('\n\n');
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

      // Secondary sync to Airtable (resilient, non-blocking)
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

      replyText += '\n\n🎉 *Order Confirmed!* Your booking has been locked in our system. Our catering manager will contact you shortly to coordinate serving logistics.';
      splitBubbles.push('🎉 *Order Confirmed!* Your booking has been locked in our system. Our catering manager will contact you shortly to coordinate serving logistics.');
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
      splitBubbles,
      interactiveButtons: buttons,
    };
  };

  const workflow = new StateGraph(CateringStateAnnotation)
    .addNode('assistant', assistantNode)
    .addEdge('__start__', 'assistant')
    .addEdge('assistant', '__end__');

  return workflow.compile({ checkpointer: memorySaver });
}
