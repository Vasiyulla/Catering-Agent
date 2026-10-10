import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { maskPhoneNumber } from '../common/utils/pii.util.js';

export interface InteractiveButton {
  id: string;
  title: string;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly phoneNumberId: string;
  private readonly accessToken: string;
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    this.phoneNumberId = this.configService.get<string>('whatsapp.phoneNumberId') ?? '';
    this.accessToken = this.configService.get<string>('whatsapp.accessToken') ?? '';
    this.isConfigured = Boolean(this.phoneNumberId && this.accessToken);

    if (this.isConfigured) {
      this.logger.log(`WhatsApp Cloud API configured with Phone ID: ${this.phoneNumberId}`);
    } else {
      this.logger.warn('WhatsApp credentials not set in environment. Running in mock simulation mode.');
    }
  }

  /**
   * Marks incoming message as read (blue ticks) in WhatsApp
   */
  public async markAsRead(messageId: string): Promise<boolean> {
    if (!this.isConfigured || !messageId) {
      return true;
    }

    try {
      const url = `https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`;
      await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          validateStatus: () => true,
        },
      );
      return true;
    } catch {
      // Non-blocking fail-safe
      return false;
    }
  }

  /**
   * Sends a text message with simulated natural human typing cadence
   */
  public async sendTextMessage(to: string, message: string): Promise<boolean> {
    const maskedTo = maskPhoneNumber(to);

    if (!this.isConfigured) {
      this.logger.log(`\n💬 [MOCK WHATSAPP OUTBOUND to ${maskedTo}]\n----------------------------------------\n${message}\n----------------------------------------`);
      return true;
    }

    try {
      // 1. Natural typing delay simulation (e.g. 1.2s to 2.5s) to feel genuinely human
      const typingDelayMs = Math.min(Math.max(message.length * 20, 1200), 2500);
      await new Promise((resolve) => setTimeout(resolve, typingDelayMs));

      const url = `https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`;
      this.logger.log(`📤 Sending WhatsApp message to ${maskedTo}...`);

      const res = await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: { preview_url: false, body: message },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
      this.logger.log(`✅ Successfully sent WhatsApp text message to ${maskedTo} (Message ID: ${res.data?.messages?.[0]?.id})`);
      return true;
    } catch (err: unknown) {
      const error = err as { response?: { data?: unknown; status?: number }; message: string };
      this.logger.error(`❌ FAILED to send WhatsApp message to ${maskedTo}: Status ${error.response?.status} - ${JSON.stringify(error.response?.data || error.message)}`);
      return false;
    }
  }

  /**
   * Sends multiple split chat bubbles with natural pauses between them
   */
  public async sendSplitBubbles(to: string, bubbles: string[]): Promise<boolean> {
    for (let i = 0; i < bubbles.length; i++) {
      const bubble = bubbles[i];
      if (bubble.trim()) {
        await this.sendTextMessage(to, bubble.trim());
        if (i < bubbles.length - 1 && this.isConfigured) {
          // Pause 1.5 seconds between natural bubbles
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }
    }
    return true;
  }

  /**
   * Sends interactive reply buttons
   */
  public async sendInteractiveButtons(to: string, bodyText: string, buttons: InteractiveButton[]): Promise<boolean> {
    const maskedTo = maskPhoneNumber(to);

    if (!this.isConfigured) {
      const buttonTitles = buttons.map((b) => `[ ${b.title} ]`).join(' ');
      this.logger.log(`\n💬 [MOCK WHATSAPP BUTTONS to ${maskedTo}]\n${bodyText}\nButtons: ${buttonTitles}\n----------------------------------------`);
      return true;
    }

    try {
      const url = `https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`;
      this.logger.log(`📤 Sending WhatsApp interactive buttons to ${maskedTo}...`);

      const res = await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: { text: bodyText },
            action: {
              buttons: buttons.slice(0, 3).map((b) => ({
                type: 'reply',
                reply: { id: b.id, title: b.title.slice(0, 20) },
              })),
            },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
      this.logger.log(`✅ Successfully sent WhatsApp interactive buttons to ${maskedTo} (Message ID: ${res.data?.messages?.[0]?.id})`);
      return true;
    } catch (err: unknown) {
      const error = err as { response?: { data?: unknown; status?: number }; message: string };
      this.logger.warn(`Interactive button failed (${JSON.stringify(error.response?.data || error.message)}). Falling back to text message...`);
      return this.sendTextMessage(to, `${bodyText}\n\nOptions:\n${buttons.map((b) => `• ${b.title}`).join('\n')}`);
    }
  }

  /**
   * Downloads binary media (such as audio voice notes) from Meta Graph API
   */
  public async downloadMediaBuffer(mediaId: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
    if (!this.isConfigured || !mediaId) {
      return null;
    }

    try {
      // 1. Retrieve direct media download URL from Meta
      const metaUrl = `https://graph.facebook.com/v21.0/${mediaId}`;
      const metaRes = await axios.get(metaUrl, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });

      const downloadUrl = metaRes.data?.url;
      const mimeType = metaRes.data?.mime_type || 'audio/ogg';
      if (!downloadUrl) return null;

      // 2. Download raw media bytes with authentication header
      const binaryRes = await axios.get(downloadUrl, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
        responseType: 'arraybuffer',
      });

      return {
        buffer: Buffer.from(binaryRes.data),
        mimeType,
      };
    } catch (err: unknown) {
      this.logger.error(`Failed to download WhatsApp media ${mediaId}: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * Transcribes voice note audio buffer using Gemini Multimodal or OpenAI Whisper
   */
  public async transcribeAudio(audioBuffer: Buffer, mimeType = 'audio/ogg'): Promise<string> {
    const geminiKey = this.configService.get<string>('ai.geminiApiKey');
    const openaiKey = this.configService.get<string>('ai.openaiApiKey');

    if (geminiKey) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
        const base64Audio = audioBuffer.toString('base64');
        const res = await axios.post(
          url,
          {
            contents: [
              {
                parts: [
                  {
                    text: 'You are an Indian catering concierge. Transcribe the following customer WhatsApp voice note verbatim into text. If the speech is in Hindi, Gujarati, Punjabi, or Hinglish, transcribe the meaning clearly into Roman script / English so the catering coordinator can fulfill the feast order.',
                  },
                  {
                    inlineData: {
                      mimeType: mimeType.split(';')[0].trim(),
                      data: base64Audio,
                    },
                  },
                ],
              },
            ],
          },
          { headers: { 'Content-Type': 'application/json' } },
        );

        const candidateText = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText) {
          return candidateText.trim();
        }
      } catch (err: unknown) {
        this.logger.warn(`Gemini audio transcription failed: ${(err as Error).message}`);
      }
    }

    if (openaiKey) {
      try {
        const formData = new FormData();
        const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
        formData.append('file', blob, 'voice_note.ogg');
        formData.append('model', 'whisper-1');

        const res = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
          headers: {
            Authorization: `Bearer ${openaiKey}`,
          },
        });
        if (res.data?.text) {
          return res.data.text.trim();
        }
      } catch (err: unknown) {
        this.logger.warn(`OpenAI Whisper transcription failed: ${(err as Error).message}`);
      }
    }

    return '';
  }
}
