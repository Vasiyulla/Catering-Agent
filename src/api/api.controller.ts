import { Controller, Get, Post, Patch, Body, Param, Query, Logger, Sse, MessageEvent, Optional } from '@nestjs/common';
import { Observable } from 'rxjs';
import { MenuService } from '../menu/menu.service.js';
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
