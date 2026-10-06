export interface WhatsAppMessageText {
  body: string;
}

export interface WhatsAppInteractiveResponse {
  type: 'button_reply' | 'list_reply';
  button_reply?: {
    id: string;
    title: string;
  };
  list_reply?: {
    id: string;
    title: string;
    description?: string;
  };
}

export interface WhatsAppIncomingMessage {
  from: string;
  id: string; // wamid
  timestamp: string;
  type: 'text' | 'interactive' | 'button' | 'image' | 'audio';
  text?: WhatsAppMessageText;
  interactive?: WhatsAppInteractiveResponse;
}

export interface WhatsAppWebhookContact {
  profile: {
    name: string;
  };
  wa_id: string;
}

export interface WhatsAppWebhookEntryChangeValue {
  messaging_product: string;
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: WhatsAppWebhookContact[];
  messages?: WhatsAppIncomingMessage[];
}

export interface WhatsAppWebhookEntry {
  id: string;
  changes: {
    field: string;
    value: WhatsAppWebhookEntryChangeValue;
  }[];
}

export interface WhatsAppWebhookPayload {
  object: string;
  entry: WhatsAppWebhookEntry[];
}
