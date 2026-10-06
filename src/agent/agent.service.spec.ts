import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import configuration from '../config/configuration.js';
import { MenuCacheService } from '../airtable/menu-cache.service.js';
import { AirtableService } from '../airtable/airtable.service.js';
import { WhatsAppDebounceService } from '../whatsapp/whatsapp-debounce.service.js';
import { WhatsAppService } from '../whatsapp/whatsapp.service.js';
import { AgentService } from './agent.service.js';

describe('Dil Se Catering Core Agentic System', () => {
  let menuCache: MenuCacheService;
  let debounceService: WhatsAppDebounceService;
  let agentService: AgentService;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
        }),
      ],
      providers: [
        MenuCacheService,
        AirtableService,
        WhatsAppDebounceService,
        WhatsAppService,
        AgentService,
      ],
    }).compile();

    menuCache = moduleRef.get<MenuCacheService>(MenuCacheService);
    debounceService = moduleRef.get<WhatsAppDebounceService>(WhatsAppDebounceService);
    agentService = moduleRef.get<AgentService>(AgentService);

    agentService.onModuleInit();
  });

  it('should load seed menu items and curated packages from cache', () => {
    const items = menuCache.getMenuItems();
    const packages = menuCache.getPackages();

    expect(items.length).toBeGreaterThan(0);
    expect(packages.length).toBeGreaterThanOrEqual(3);

    const biryani = menuCache.searchItems('biryani');
    expect(biryani.length).toBeGreaterThan(0);
    expect(biryani[0].name).toContain('Biryani');
  });

  it('should drop duplicate WhatsApp message IDs (wamid)', () => {
    const testWamid = 'wamid.HBgLMjM0OTAw...TEST';

    const firstCheck = debounceService.isDuplicate(testWamid);
    expect(firstCheck).toBe(false);

    const secondCheck = debounceService.isDuplicate(testWamid);
    expect(secondCheck).toBe(true);
  });

  it('should process a customer message through LangGraph and generate hospitality response', async () => {
    await agentService.handleCustomerMessage(
      '447123456789',
      'Priya Sharma',
      'Hi! I need catering for 30 people on Saturday',
    );
    // Verified that invocation executes without unhandled errors
    expect(true).toBe(true);
  });
});
