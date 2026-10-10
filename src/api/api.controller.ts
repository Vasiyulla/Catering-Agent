import { Controller, Get, Post, Put, Delete, Patch, Body, Param, Query, Logger, Sse, MessageEvent, Optional } from '@nestjs/common';
import { Observable } from 'rxjs';
import { MenuService, MenuItem, CateringPackage } from '../menu/menu.service.js';
import { DatabaseService } from '../database/database.service.js';
import { BillingEngineService } from '../agent/billing/billing-engine.service.js';
import { HostProtectionService } from '../agent/protection/host-protection.service.js';
import { EventsService } from '../events/events.service.js';
import { CalculateQuoteDto } from './dto/calculate-quote.dto.js';

@Controller('api')
export class ApiController {
  private readonly logger = new Logger(ApiController.name);

  constructor(
    private readonly menuService: MenuService,
    private readonly databaseService: DatabaseService,
    private readonly billingEngineService: BillingEngineService,
    private readonly hostProtectionService: HostProtectionService,
    @Optional()
    private readonly eventsService?: EventsService,
  ) {}

  /**
   * SSE Stream endpoint: Pushes real-time order, audit and agent telemetry events
   */
  @Sse('events')
  streamEvents(): Observable<MessageEvent> {
    if (!this.eventsService) {
      throw new Error('EventsService is not configured');
    }
    return this.eventsService.getStream();
  }

  /**
   * GET /api/menu
   * Returns curated feast packages and a la carte bulk party trays
   */
  @Get('menu')
  getMenu() {
    return {
      packages: this.menuService.getPackages(),
      items: this.menuService.getMenuItems(),
    };
  }

  /**
   * POST /api/menu/items
   * Admin: Adds a new menu dish to catalog
   */
  @Post('menu/items')
  createMenuItem(@Body() body: Omit<MenuItem, 'id'>) {
    const item = this.menuService.addMenuItem(body);
    return { success: true, item };
  }

  /**
   * PUT /api/menu/items/:id
   * Admin: Updates pricing, availability or details of an existing menu dish
   */
  @Put('menu/items/:id')
  updateMenuItem(@Param('id') id: string, @Body() body: Partial<MenuItem>) {
    const updated = this.menuService.updateMenuItem(id, body);
    if (!updated) {
      return { success: false, error: 'Item not found' };
    }
    return { success: true, item: updated };
  }

  /**
   * DELETE /api/menu/items/:id
   * Admin: Deletes/archives a menu dish
   */
  @Delete('menu/items/:id')
  deleteMenuItem(@Param('id') id: string) {
    const success = this.menuService.deleteMenuItem(id);
    return { success, id };
  }

  /**
   * PUT /api/menu/packages/:id
   * Admin: Updates feast package rates and inclusions
   */
  @Put('menu/packages/:id')
  updatePackage(@Param('id') id: string, @Body() body: Partial<CateringPackage>) {
    const updated = this.menuService.updatePackage(id, body);
    if (!updated) {
      return { success: false, error: 'Package not found' };
    }
    return { success: true, package: updated };
  }

  /**
   * POST /api/menu/generate-card
   * Generates formatted royal visual menu card payload and WhatsApp-formatted text
   */
  @Post('menu/generate-card')
  generateMenuCard(
    @Body()
    body: {
      hostName?: string;
      guestCount?: number;
      eventDate?: string;
      orderMode?: 'FEAST_PACKAGE' | 'A_LA_CARTE_TRAYS';
      packageId?: string;
      selectedItems?: Array<{ id: string; name?: string; category?: string; quantity: number }>;
      totalAmount?: number;
      dietaryNote?: string;
    },
  ) {
    const host = body.hostName || 'Valued Host';
    const guests = body.guestCount || 40;
    const date = body.eventDate || 'Upcoming Celebration';
    const total = body.totalAmount || 0;
    const deposit = (total * 0.5).toFixed(2);

    const itemsByCategory: Record<string, string[]> = {};
    if (body.selectedItems && body.selectedItems.length > 0) {
      body.selectedItems.forEach((item) => {
        const cat = item.category || 'Curated Selections';
        if (!itemsByCategory[cat]) itemsByCategory[cat] = [];
        itemsByCategory[cat].push(`${item.name || item.id} (${item.quantity}x Tray)`);
      });
    }

    let whatsappText = `👑 *DIL SE CULINARY OPERATIONS • ROYAL BANQUET SPECIFICATION* 👑\n`;
    whatsappText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    whatsappText += `📋 *HOST:* ${host}\n`;
    whatsappText += `👥 *COVERS:* ${guests} Guests | 📅 *DATE:* ${date}\n`;
    whatsappText += `🏷️ *FORMAT:* ${body.orderMode === 'FEAST_PACKAGE' ? 'Royal Buffet Feast Package' : 'Bespoke Bulk Party Trays'}\n`;
    if (body.dietaryNote) {
      whatsappText += `🛡️ *DIETARY INTEGRITY:* ${body.dietaryNote}\n`;
    }
    whatsappText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    whatsappText += `✨ *CURATED CATERING MANIFEST:*\n`;
    Object.entries(itemsByCategory).forEach(([category, dishes]) => {
      whatsappText += `🔸 *${category.toUpperCase()}*\n`;
      dishes.forEach((d) => {
        whatsappText += `   • ${d}\n`;
      });
      whatsappText += `\n`;
    });

    whatsappText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    whatsappText += `💰 *TOTAL QUOTE:* £${total.toFixed(2)} (Buffet Chafing Warmers Included)\n`;
    whatsappText += `🔒 *50% DEPOSIT TO SECURE:* £${deposit}\n`;
    whatsappText += `✨ *All meats 100% British Halal Certified. Dedicated Pure-Veg utensils applied.*\n`;
    whatsappText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    whatsappText += `*Dil Se London Concierge:* Reply *CONFIRM* to lock this into kitchen prep schedule.`;

    return {
      success: true,
      cardData: {
        hostName: host,
        guestCount: guests,
        eventDate: date,
        totalAmount: total,
        depositAmount: deposit,
        itemsByCategory,
        whatsappText,
      },
    };
  }

  /**
   * POST /api/calculator/quote
   * Computes a 100% deterministic catering quote and host-protection audit
   */
  @Post('calculator/quote')
  calculateQuote(@Body() body: CalculateQuoteDto) {
    const guests = Math.max(1, body.guestCount || 20);
    const mode = body.orderMode || 'FEAST_PACKAGE';

    let quoteResult;
    if (mode === 'FEAST_PACKAGE') {
      quoteResult = this.billingEngineService.calculateFeastPackage({
        packageIdOrName: body.packageId || 'PKG-SILVER',
        guestCount: guests,
        postcode: body.postcode,
      });
    } else {
      const items =
        body.trayItems && body.trayItems.length > 0
          ? body.trayItems
          : this.billingEngineService.recommendPortionsForGuests(guests, body.dietaryPreference);

      quoteResult = this.billingEngineService.calculateTrayOrder({
        items,
        guestCount: guests,
        postcode: body.postcode,
      });
    }

    const hostAudit = this.hostProtectionService.auditOrder({
      guestCount: guests,
      orderMode: mode,
      items: quoteResult.items?.map((i) => ({ dishName: i.dishName, quantity: i.quantity })),
      dietaryPreference: body.dietaryPreference,
      packageId: body.packageId,
    });

    return {
      quote: quoteResult,
      hostProtection: hostAudit,
    };
  }

  /**
   * GET /api/orders
   * Returns all recorded customer orders with status, customer & event details
   */
  @Get('orders')
  getOrders() {
    return {
      orders: this.databaseService.getAllOrders(),
    };
  }

  /**
   * POST /api/orders
   * Direct order creation with customer and event relational binding
   */
  @Post('orders')
  async createOrder(@Body() body: any) {
    const customer = await this.databaseService.findOrCreateCustomer(
      body.customerName || 'Valued Host',
      body.phoneNumber || '+44 7000 000000',
      body.postcode || 'London',
    );

    const event = await this.databaseService.createEvent({
      customerId: customer.id,
      eventType: body.eventType || 'Royal Celebration Feast',
      eventDate: body.eventDate || new Date().toISOString().split('T')[0],
      servingTime: body.servingTime || '18:30 BST',
      guestCount: body.guestCount || 50,
      deliveryAddress: body.deliveryAddress || body.postcode || 'London Venue',
      dietaryPreference: body.dietaryPreference || 'Mixed 60/40 (Halal Meat + Veg Cushion)',
      status: body.status || 'CONFIRMED',
    });

    const order = await this.databaseService.createOrder({
      customerId: customer.id,
      eventId: event.id,
      orderMode: body.orderMode || 'FEAST_PACKAGE',
      selectedPackageId: body.packageId || 'PKG-GOLD',
      totalAmount: body.totalAmount || 900.0,
      itemsSummary: body.itemsSummary || 'Dil Se Royal Celebration Feast',
    });

    return {
      success: true,
      order: {
        ...order,
        customer,
        event,
      },
    };
  }

  /**
   * POST /api/seed
   * Resets / populates canonical enterprise orders, customer dossiers, messages, and handoffs
   */
  @Post('seed')
  seedDatabase(@Query('force') force?: string) {
    const isForced = force === 'true' || force === '1';
    const seeded = this.databaseService.seedInitialData(isForced);
    return {
      success: true,
      seeded,
      stats: this.databaseService.getStats(),
    };
  }

  /**
   * PATCH /api/orders/:id/status
   * Updates an order's status (e.g., CONFIRMED -> KITCHEN_PREP -> DISPATCHED)
   */
  @Patch('orders/:id/status')
  updateOrderStatus(@Param('id') id: string, @Body('status') status: string) {
    const success = this.databaseService.updateOrderStatus(id, status);
    return { success, orderId: id, status };
  }

  /**
   * GET /api/handoffs
   * Returns all human handoff requests
   */
  @Get('handoffs')
  getHandoffs() {
    return {
      handoffs: this.databaseService.getAllHandoffs(),
    };
  }

  /**
   * POST /api/handoffs/:phone/resolve
   * Resolves a pending human handoff
   */
  @Post('handoffs/:phone/resolve')
  resolveHandoff(@Param('phone') phone: string) {
    const success = this.databaseService.resolveHandoff(phone);
    return { success, phoneNumber: phone };
  }

  /**
   * GET /api/messages/:phone
   * Returns conversation transcript for a given customer phone number
   */
  @Get('messages/:phone')
  getMessages(@Param('phone') phone: string) {
    return {
      messages: this.databaseService.getMessagesForPhone(phone),
    };
  }

  /**
   * POST /api/messages/:phone
   * Dispatches and records an outbound manual reply from dashboard staff
   */
  @Post('messages/:phone')
  async sendMessage(@Param('phone') phone: string, @Body('messageText') text: string) {
    await this.databaseService.logMessage({
      phoneNumber: phone,
      direction: 'OUTBOUND',
      messageText: text || '',
    });
    return {
      success: true,
      phoneNumber: phone,
      text,
    };
  }

  /**
   * GET /api/stats
   * Returns high-level operational statistics
   */
  @Get('stats')
  getStats() {
    return this.databaseService.getStats();
  }
}
