export interface AppConfig {
  port: number;
  nodeEnv: string;
  whatsapp: {
    phoneNumberId: string;
    accessToken: string;
    verifyToken: string;
    appSecret: string;
  };
  ai: {
    provider: 'gemini' | 'openai';
    geminiApiKey: string;
    geminiModel: string;
    openaiApiKey: string;
    openaiModel: string;
  };
  airtable: {
    apiKey: string;
    baseId: string;
    tables: {
      menu: string;
      packages: string;
      customers: string;
      events: string;
      orders: string;
      conversations: string;
    };
  };
  business: {
    minGuests: number;
    minLeadTimeHours: number;
    defaultCurrency: string;
  };
}

export default (): AppConfig => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  whatsapp: {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? '',
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN ?? '',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? 'dil_se_catering_webhook_verify_secret',
    appSecret: process.env.WHATSAPP_APP_SECRET ?? '',
  },
  ai: {
    provider: (process.env.AI_PROVIDER as 'gemini' | 'openai') ?? 'gemini',
    geminiApiKey: process.env.GEMINI_API_KEY ?? '',
    geminiModel: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
    openaiApiKey: process.env.OPENAI_API_KEY ?? '',
    openaiModel: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  },
  airtable: {
    apiKey: process.env.AIRTABLE_API_KEY ?? '',
    baseId: process.env.AIRTABLE_BASE_ID ?? '',
    tables: {
      menu: process.env.AIRTABLE_MENU_TABLE ?? 'Menu',
      packages: process.env.AIRTABLE_PACKAGES_TABLE ?? 'Packages',
      customers: process.env.AIRTABLE_CUSTOMERS_TABLE ?? 'Customers',
      events: process.env.AIRTABLE_EVENTS_TABLE ?? 'Events',
      orders: process.env.AIRTABLE_ORDERS_TABLE ?? 'Orders',
      conversations: process.env.AIRTABLE_CONVERSATIONS_TABLE ?? 'Conversations',
    },
  },
  business: {
    minGuests: parseInt(process.env.CATERING_MIN_GUESTS ?? '15', 10),
    minLeadTimeHours: parseInt(process.env.CATERING_MIN_LEAD_TIME_HOURS ?? '48', 10),
    defaultCurrency: process.env.DEFAULT_CURRENCY ?? '£',
  },
});
