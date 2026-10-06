import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI } from '@langchain/openai';
import { MenuCacheService } from '../airtable/menu-cache.service.js';
import { AirtableService } from '../airtable/airtable.service.js';
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
    private readonly airtableService: AirtableService,
    @Inject(forwardRef(() => WhatsAppService))
    private readonly whatsappService: WhatsAppService,
  ) {}

  onModuleInit() {
    this.initializeLLM();
    this.graph = buildCateringGraph(
      this.llm,
      this.menuCacheService,
      this.airtableService,
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
      const buttons = result.interactiveButtons || [];

      if (buttons && buttons.length > 0) {
        await this.whatsappService.sendInteractiveButtons(phoneNumber, reply, buttons);
      } else {
        await this.whatsappService.sendTextMessage(phoneNumber, reply);
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
