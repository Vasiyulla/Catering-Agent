import { Injectable, Logger, OnModuleInit, Inject, forwardRef, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI } from '@langchain/openai';
import { MenuCacheService } from '../airtable/menu-cache.service.js';
import { AirtableService } from '../airtable/airtable.service.js';
import { DatabaseService } from '../database/database.service.js';
import { BillingEngineService } from './billing/billing-engine.service.js';
import { HostProtectionService } from './protection/host-protection.service.js';
import { buildCateringGraph } from './graph/catering.graph.js';
import { WhatsAppService } from '../whatsapp/whatsapp.service.js';

@Injectable()
export class AgentService implements OnModuleInit {
  private readonly logger = new Logger(AgentService.name);
  private graph: ReturnType<typeof buildCateringGraph> | null = null;
  private llm: BaseChatModel | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly menuCacheService: MenuCacheService,
    private readonly databaseService: DatabaseService,
    private readonly billingEngineService: BillingEngineService,
    private readonly hostProtectionService: HostProtectionService,
    @Inject(forwardRef(() => WhatsAppService))
    private readonly whatsappService: WhatsAppService,
    @Optional()
    private readonly airtableService?: AirtableService,
  ) {}

  onModuleInit() {
    this.initializeLLM();
    this.graph = buildCateringGraph(
      this.llm,
      this.menuCacheService,
      this.airtableService,
      this.databaseService,
      this.billingEngineService,
      this.hostProtectionService,
    );
    this.logger.log('LangGraph agent initialized with thread checkpointer.');
  }

  private initializeLLM(): void {
    const provider = this.configService.get<string>('ai.provider');
    const geminiKey = this.configService.get<string>('ai.geminiApiKey');
    const geminiModel = this.configService.get<string>('ai.geminiModel') || 'gemini-2.5-flash';
    const openaiKey = this.configService.get<string>('ai.openaiApiKey');
    const openaiModel = this.configService.get<string>('ai.openaiModel') || 'gpt-4o-mini';

    const openrouterKey = this.configService.get<string>('ai.openrouterApiKey');
    const openrouterModel = this.configService.get<string>('ai.openrouterModel') || 'openai/gpt-4o-mini';

    if (provider === 'openrouter' && openrouterKey) {
      this.llm = new ChatOpenAI({
        apiKey: openrouterKey,
        model: openrouterModel,
        configuration: {
          baseURL: 'https://openrouter.ai/api/v1',
          defaultHeaders: {
            'HTTP-Referer': 'https://catering-agent.onrender.com',
            'X-Title': 'Dil Se Catering Agent',
          },
        },
        temperature: 0.2,
      });
      this.logger.log(`Initialized OpenRouter LLM (${openrouterModel}).`);
    } else if (provider === 'gemini' && geminiKey) {
      this.llm = new ChatGoogleGenerativeAI({
        apiKey: geminiKey,
        model: geminiModel,
        temperature: 0.2,
      });
      this.logger.log(`Initialized Google Gemini LLM (${geminiModel}).`);
    } else if (provider === 'openai' && openaiKey) {
      this.llm = new ChatOpenAI({
        apiKey: openaiKey,
        model: openaiModel,
        temperature: 0.2,
      });
      this.logger.log(`Initialized OpenAI LLM (${openaiModel}).`);
    } else {
      this.logger.warn('No LLM API keys detected. Operating in deterministic rule-based assistant mode.');
      this.llm = null;
    }
  }

  public async handleCustomerMessage(
    phoneNumber: string,
    senderName: string,
    messageText: string,
  ): Promise<void> {
    if (!this.graph) {
      this.logger.error('Graph is not initialized.');
      return;
    }

    try {
      this.logger.log(`Invoking agent graph for ${phoneNumber} (${senderName})...`);

      // 1. Enterprise Database: Register/retrieve customer & audit message atomically
      const dbCust = await this.databaseService.findOrCreateCustomer(senderName, phoneNumber);
      await this.databaseService.logMessage({
        customerId: dbCust.id,
        phoneNumber,
        direction: 'INBOUND',
        messageText,
      });

      // 2. Optional secondary viewer sync (Airtable, non-blocking)
      if (this.airtableService) {
        try {
          await this.airtableService.findOrCreateCustomer(senderName, phoneNumber);
        } catch (err: unknown) {
          this.logger.warn(`Secondary Airtable sync skipped: ${(err as Error).message}`);
        }
      }

      const result = await this.graph.invoke(
        {
          phoneNumber,
          customerName: senderName,
          lastUserMessage: messageText,
        },
        {
          configurable: {
            thread_id: phoneNumber,
          },
        },
      );

      const reply = result.replyMessage;
      const splitBubbles: string[] =
        result.splitBubbles && result.splitBubbles.length > 0
          ? result.splitBubbles
          : (reply ? [reply] : []);
      const buttons = result.interactiveButtons || [];

      if (buttons && buttons.length > 0) {
        if (splitBubbles.length > 1) {
          const leadBubbles = splitBubbles.slice(0, -1);
          const finalBubble = splitBubbles[splitBubbles.length - 1];
          await this.whatsappService.sendSplitBubbles(phoneNumber, leadBubbles);
          await this.whatsappService.sendInteractiveButtons(phoneNumber, finalBubble, buttons);
        } else {
          await this.whatsappService.sendInteractiveButtons(
            phoneNumber,
            splitBubbles[0] || reply,
            buttons,
          );
        }
      } else {
        await this.whatsappService.sendSplitBubbles(phoneNumber, splitBubbles);
      }
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error(`Error during agent execution: ${error.message}`);
      await this.whatsappService.sendTextMessage(
        phoneNumber,
        'Namaste! We are currently experiencing a brief technical glitch. Our team has been notified and will message you directly shortly. ❤️',
      );
    }
  }
}
