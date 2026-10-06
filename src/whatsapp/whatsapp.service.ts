import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

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
      this.logger.log('WhatsApp Cloud API service configured.');
    } else {
      this.logger.warn('WhatsApp credentials not set in environment. Running in mock simulation mode.');
    }
  }

  public async sendTextMessage(to: string, message: string): Promise<boolean> {
    if (!this.isConfigured) {
      this.logger.log(`\n💬 [MOCK WHATSAPP OUTBOUND to ${to}]\n----------------------------------------\n${message}\n----------------------------------------`);
      return true;
    }

    try {
      const url = `https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`;
      await axios.post(
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
      this.logger.log(`Sent WhatsApp text message to ${to}`);
      return true;
    } catch (err: unknown) {
      const error = err as { response?: { data?: unknown }; message: string };
      this.logger.error(`Failed to send WhatsApp message: ${JSON.stringify(error.response?.data || error.message)}`);
      return false;
    }
  }

  public async sendInteractiveButtons(to: string, bodyText: string, buttons: InteractiveButton[]): Promise<boolean> {
    if (!this.isConfigured) {
      const buttonTitles = buttons.map((b) => `[ ${b.title} ]`).join(' ');
      this.logger.log(`\n💬 [MOCK WHATSAPP BUTTONS to ${to}]\n${bodyText}\nButtons: ${buttonTitles}\n----------------------------------------`);
      return true;
    }

    try {
      const url = `https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`;
      await axios.post(
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
      this.logger.log(`Sent WhatsApp interactive buttons to ${to}`);
      return true;
    } catch (err: unknown) {
      const error = err as { response?: { data?: unknown }; message: string };
      this.logger.error(`Failed to send WhatsApp interactive buttons: ${JSON.stringify(error.response?.data || error.message)}`);
      // Fallback to text message if interactive fails
      return this.sendTextMessage(to, `${bodyText}\n\nOptions:\n${buttons.map((b) => `• ${b.title}`).join('\n')}`);
    }
  }
}
