import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Res,
  HttpStatus,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { WhatsAppDebounceService } from './whatsapp-debounce.service.js';
import { WhatsAppService } from './whatsapp.service.js';
import { AgentService } from '../agent/agent.service.js';
import { maskPhoneNumber } from '../common/utils/pii.util.js';
import type { WhatsAppWebhookPayload } from './dto/whatsapp-webhook.dto.js';

@Controller(['webhook', 'api/webhook'])
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly debounceService: WhatsAppDebounceService,
    private readonly whatsappService: WhatsAppService,
    @Inject(forwardRef(() => AgentService))
    private readonly agentService: AgentService,
  ) {}

  /**
   * Meta Webhook verification handshake
   */
  @Get()
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const configuredToken = this.configService.get<string>('whatsapp.verifyToken');
    this.logger.log(`[VERIFY_REQUEST] mode: ${mode}, token: ${token}`);

    if (mode === 'subscribe' && token === configuredToken) {
      this.logger.log('WhatsApp Webhook successfully verified by Meta.');
      return res.status(HttpStatus.OK).send(challenge);
    }

    this.logger.warn(`Webhook verification failed. Token mismatch: ${token}`);
    return res.status(HttpStatus.FORBIDDEN).send('Verification token mismatch');
  }

  /**
   * Incoming Meta message webhook receiver
   */
  @Post()
  async handleIncomingWebhook(@Body() payload: any, @Res() res: Response) {
    this.logger.log(`📥 [INCOMING_META_WEBHOOK] Entry count: ${payload?.entry?.length || 0}`);

    // 1. Return HTTP 200 OK immediately to satisfy Meta's 3-second SLA
    res.status(HttpStatus.OK).send('EVENT_RECEIVED');

    // 2. Asynchronously process payload
    try {
      const entries = payload?.entry || [];
      for (const entry of entries) {
        for (const change of entry.changes || []) {
          const value = change.value;
          const contacts = value.contacts || [];
          const messages = value.messages || [];
          const statuses = value.statuses || [];

          if (statuses.length > 0) {
            this.logger.log(`ℹ️ [META_STATUS_UPDATE] Message status: ${statuses[0]?.status} for ${maskPhoneNumber(statuses[0]?.recipient_id)}`);
          }

          for (const msg of messages) {
            const wamid = msg.id;

            // Deduplication check
            if (this.debounceService.isDuplicate(wamid)) {
              this.logger.log(`⏭️ [DROPPED_DUPLICATE] wamid: ${wamid}`);
              continue;
            }

            const from = msg.from;
            const senderName = contacts.find((c: any) => c.wa_id === from)?.profile?.name || 'Customer';

            let incomingText = '';
            if (msg.type === 'text' && msg.text?.body) {
              incomingText = msg.text.body;
            } else if (msg.type === 'interactive' && msg.interactive?.button_reply?.title) {
              incomingText = msg.interactive.button_reply.title;
            } else if (msg.type === 'audio' && msg.audio?.id) {
              this.logger.log(`🎙️ [AUDIO_VOICE_NOTE_DETECTED] Processing audio message ID: ${msg.audio.id}`);
              const media = await this.whatsappService.downloadMediaBuffer(msg.audio.id);
              if (media?.buffer) {
                const transcribed = await this.whatsappService.transcribeAudio(media.buffer, media.mimeType);
                if (transcribed) {
                  incomingText = `[Voice Note]: ${transcribed}`;
                  this.logger.log(`🎙️ [TRANSCRIPTION_SUCCESS] "${incomingText}"`);
                }
              }
            }

            this.logger.log(`📩 [MESSAGE_RECEIVED] From: ${maskPhoneNumber(from)} (${senderName}) | Text: "${incomingText}"`);

            // Instantly send read receipts (blue ticks) for realistic human responsiveness
            await this.whatsappService.markAsRead(wamid);

            if (incomingText.trim()) {
              this.debounceService.bufferMessage(
                from,
                senderName,
                incomingText,
                async (senderPhone, name, combined) => {
                  this.logger.log(`🚀 [DISPATCHING_TO_AGENT] Processing for ${maskPhoneNumber(senderPhone)}: "${combined}"`);
                  await this.agentService.handleCustomerMessage(senderPhone, name, combined);
                },
              );
            }
          }
        }
      }
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error(`Error in webhook ingestion pipeline: ${error.message}`);
    }
  }

  /**
   * Simulation Endpoint for local dev & testing without active Meta webhook
   */
  @Post('simulate')
  async simulateCustomerMessage(
    @Body() body: { from?: string; name?: string; message: string },
    @Res() res: Response,
  ) {
    const from = body.from || '447000000001';
    const name = body.name || 'Test User';
    const message = body.message;

    if (!message) {
      return res.status(HttpStatus.BAD_REQUEST).json({ error: 'message field is required' });
    }

    this.logger.log(`[SIMULATION_REQUEST] From: ${from} | Name: ${name} | Message: "${message}"`);
    await this.agentService.handleCustomerMessage(from, name, message);

    return res.status(HttpStatus.OK).json({
      status: 'success',
      message: 'Simulated customer message sent to LangGraph agent pipeline',
      details: { from, name, prompt: message },
    });
  }

  /**
   * Simulation Endpoint for Voice Note testing
   */
  @Post('simulate-voice')
  async simulateVoiceNote(
    @Body()
    body: {
      from?: string;
      name?: string;
      transcript?: string;
      audioBase64?: string;
      mimeType?: string;
    },
    @Res() res: Response,
  ) {
    const from = body.from || '447000000002';
    const name = body.name || 'Simulated Voice Host';
    let text = body.transcript;

    if (!text && body.audioBase64) {
      const buffer = Buffer.from(body.audioBase64, 'base64');
      text = await this.whatsappService.transcribeAudio(buffer, body.mimeType || 'audio/ogg');
    }

    if (!text) {
      text = 'Namaste, we need catering for 60 guests in Wembley this Saturday for our anniversary dinner. Can you send the Royal Gold package quote?';
    }

    const fullPrompt = `[Voice Note]: ${text}`;
    this.logger.log(`🎙️ [SIMULATE_VOICE] Processing voice note prompt: "${fullPrompt}"`);
    await this.agentService.handleCustomerMessage(from, name, fullPrompt);

    return res.status(HttpStatus.OK).json({
      status: 'success',
      transcription: text,
      message: 'Simulated customer voice note transcribed and processed by agent pipeline',
      details: { from, name, prompt: fullPrompt },
    });
  }
}
