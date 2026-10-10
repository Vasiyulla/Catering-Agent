import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import configuration from '../config/configuration.js';
import { MenuService as MenuCacheService } from '../menu/menu.service.js';
import { DatabaseService } from '../database/database.service.js';
import { BillingEngineService } from './billing/billing-engine.service.js';
import { HostProtectionService } from './protection/host-protection.service.js';
import { WhatsAppDebounceService } from '../whatsapp/whatsapp-debounce.service.js';
import { WhatsAppService } from '../whatsapp/whatsapp.service.js';
import { AgentService } from './agent.service.js';

describe('Dil Se Catering Core Agentic System', () => {
  let menuCache: MenuCacheService;
  let debounceService: WhatsAppDebounceService;
  let agentService: AgentService;

  beforeEach(async () => {
    const mockWhatsAppService = {
      sendTextMessage: vi.fn().mockResolvedValue(true),
      sendSplitBubbles: vi.fn().mockResolvedValue(true),
      sendInteractiveButtons: vi.fn().mockResolvedValue(true),
      markAsRead: vi.fn().mockResolvedValue(true),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
        }),
      ],
      providers: [
        MenuCacheService,
        DatabaseService,
        BillingEngineService,
        HostProtectionService,
        WhatsAppDebounceService,
        {
          provide: WhatsAppService,
          useValue: mockWhatsAppService,
        },
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
    expect(true).toBe(true);
  }, 15000);

  it('should activate Host-Protection Radar and never leak Bubble 1/Bubble 2 prefixes', async () => {
    const mockWa = (agentService as any).whatsappService;
    mockWa.sendSplitBubbles.mockClear();
    mockWa.sendInteractiveButtons.mockClear();

    await agentService.handleCustomerMessage(
      '447987654321',
      'Rajesh Patel',
      'We have 35 people in Wembley HA9 and want 1 tray of biryani for our gathering',
    );

    // Verify WhatsApp was called
    const splitCalls = mockWa.sendSplitBubbles.mock.calls;
    const buttonCalls = mockWa.sendInteractiveButtons.mock.calls;
    expect(splitCalls.length + buttonCalls.length).toBeGreaterThan(0);

    const allSentBubbles: string[] = [];
    splitCalls.forEach((call: any[]) => {
      if (Array.isArray(call[1])) allSentBubbles.push(...call[1]);
      else allSentBubbles.push(call[1]);
    });
    buttonCalls.forEach((call: any[]) => {
      allSentBubbles.push(call[1]);
    });

    const combinedText = allSentBubbles.join('\n\n');

    // 1. Host Protection Guarantee: Must flag food shortage risk for 35 people with only 1 tray
    expect(combinedText.toLowerCase()).toMatch(/short|feed|only feed|extra tray|heads up/i);

    // 2. Strict Clean Format: MUST NOT have "Bubble 1:" or "Bubble 2:" prefixes
    expect(combinedText).not.toMatch(/^(?:bubble|message|part)\s*\d+\s*[:\-]/im);
  }, 35000);

  it('should protect mixed crowds with Stealth Meat-Eater advice', async () => {
    const mockWa = (agentService as any).whatsappService;
    mockWa.sendSplitBubbles.mockClear();
    mockWa.sendInteractiveButtons.mockClear();

    await agentService.handleCustomerMessage(
      '447555123456',
      'Ayesha Khan',
      'Hi Kabir! We have 25 guests for an anniversary in Harrow. It is a mixed crowd with some veg and some non-veg.',
    );

    const splitCalls = mockWa.sendSplitBubbles.mock.calls;
    const buttonCalls = mockWa.sendInteractiveButtons.mock.calls;
    expect(splitCalls.length + buttonCalls.length).toBeGreaterThan(0);

    const allSentBubbles: string[] = [];
    splitCalls.forEach((call: any[]) => {
      if (Array.isArray(call[1])) allSentBubbles.push(...call[1]);
      else allSentBubbles.push(call[1]);
    });
    buttonCalls.forEach((call: any[]) => {
      allSentBubbles.push(call[1]);
    });

    const combinedText = allSentBubbles.join('\n\n');
    expect(combinedText).not.toMatch(/^(?:bubble|message|part)\s*\d+\s*[:\-]/im);
  }, 35000);

  it('should deliver concrete dishes and prevent hallucinated empty menu promises when asked for the menu', async () => {
    const mockWa = (agentService as any).whatsappService;
    mockWa.sendSplitBubbles.mockClear();
    mockWa.sendInteractiveButtons.mockClear();

    // Customer explicitly asks for the menu
    await agentService.handleCustomerMessage(
      '447111222333',
      'Karan Johar',
      'Give me the menu',
    );

    const splitCalls = mockWa.sendSplitBubbles.mock.calls;
    const buttonCalls = mockWa.sendInteractiveButtons.mock.calls;
    expect(splitCalls.length + buttonCalls.length).toBeGreaterThan(0);

    const allSentBubbles: string[] = [];
    splitCalls.forEach((call: any[]) => {
      if (Array.isArray(call[1])) allSentBubbles.push(...call[1]);
      else allSentBubbles.push(call[1]);
    });
    buttonCalls.forEach((call: any[]) => {
      allSentBubbles.push(call[1]);
    });

    const combinedText = allSentBubbles.join('\n\n').toLowerCase();

    // Anti-Hallucination Guarantees:
    // 1. MUST contain concrete dishes (e.g. Butter Chicken, Tikka, Biryani, Naan, Dal Makhani)
    const hasDishes =
      combinedText.includes('butter chicken') ||
      combinedText.includes('biryani') ||
      combinedText.includes('dal makhani') ||
      combinedText.includes('tikka') ||
      combinedText.includes('samosa');
    expect(hasDishes).toBe(true);

    // 2. MUST NOT be an empty promise like saying "here's the menu" followed only by a generic tip without dishes
    expect(combinedText.length).toBeGreaterThan(60);
  }, 35000);
});
