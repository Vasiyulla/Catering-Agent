import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Airtable from 'airtable';
import { MenuCacheService } from './menu-cache.service.js';

export interface CustomerRecord {
  id?: string;
  name: string;
  phoneNumber: string;
  email?: string;
  location?: string;
  dietaryNotes?: string;
}

export interface EventRecord {
  id?: string;
  customerId: string;
  eventType: string;
  eventDate: string;
  servingTime?: string;
  guestCount: number;
  deliveryAddress: string;
  dietarySplit?: string;
  status: 'Inquiry' | 'Quoted' | 'Locked' | 'Cancelled';
}

export interface OrderRecord {
  id?: string;
  customerId: string;
  eventId: string;
  orderStatus: 'Draft Quote' | 'Pending Confirmation' | 'Confirmed' | 'In Kitchen' | 'Delivered';
  estimatedTotal: number;
  itemsSummary: string;
  specialInstructions?: string;
}

@Injectable()
export class AirtableService implements OnModuleInit {
  private readonly logger = new Logger(AirtableService.name);
  private base: Airtable.Base | null = null;
  private readonly isConfigured: boolean;

  // In-memory persistent mock storage for dev/testing when Airtable key is not set
  private mockCustomers: Map<string, CustomerRecord> = new Map();
  private mockEvents: Map<string, EventRecord> = new Map();
  private mockOrders: Map<string, OrderRecord> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly menuCacheService: MenuCacheService,
  ) {
    const apiKey = this.configService.get<string>('airtable.apiKey');
    const baseId = this.configService.get<string>('airtable.baseId');

    if (apiKey && baseId && apiKey.startsWith('pat')) {
      const airtableInstance = new Airtable({ apiKey });
      this.base = airtableInstance.base(baseId);
      this.isConfigured = true;
      this.logger.log('Connected to official Airtable Base successfully.');
    } else {
      this.isConfigured = false;
      this.logger.warn('Airtable credentials not fully provided. Operating with in-memory resilient mock adapter.');
    }
  }

  async onModuleInit() {
    if (this.isConfigured) {
      await this.refreshMenuFromAirtable();
    }
  }

  public async refreshMenuFromAirtable(): Promise<void> {
    if (!this.base) return;
    try {
      const menuTable = this.configService.get<string>('airtable.tables.menu') ?? 'Menu';
      const records = await this.base(menuTable).select({ view: 'Grid view' }).all();
      this.logger.log(`Fetched ${records.length} menu items from Airtable.`);
      // Parse records and update MenuCacheService if active records exist
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error(`Failed to refresh menu from Airtable: ${error.message}. Retaining active memory cache.`);
    }
  }

  public async findOrCreateCustomer(name: string, phoneNumber: string, location?: string): Promise<CustomerRecord> {
    if (this.base) {
      try {
        const table = this.configService.get<string>('airtable.tables.customers') ?? 'Customers';
        const existing = await this.base(table)
          .select({
            filterByFormula: `{WhatsApp Number} = '${phoneNumber}'`,
            maxRecords: 1,
          })
          .firstPage();

        if (existing.length > 0) {
          const rec = existing[0];
          return {
            id: rec.id,
            name: (rec.get('Name') as string) || name,
            phoneNumber: (rec.get('WhatsApp Number') as string) || phoneNumber,
            location: rec.get('Location') as string,
          };
        }

        const created = await this.base(table).create([
          {
            fields: {
              Name: name || 'Guest Customer',
              'WhatsApp Number': phoneNumber,
              Location: location || '',
              Status: 'Active',
            },
          },
        ]);

        return {
          id: created[0].id,
          name,
          phoneNumber,
          location,
        };
      } catch (err: unknown) {
        const error = err as Error;
        this.logger.error(`Airtable findOrCreateCustomer error: ${error.message}. Falling back to memory.`);
      }
    }

    // Fallback Mock
    if (this.mockCustomers.has(phoneNumber)) {
      return this.mockCustomers.get(phoneNumber)!;
    }
    const newCustomer: CustomerRecord = {
      id: `CUS-${Date.now().toString().slice(-4)}`,
      name: name || 'Guest Customer',
      phoneNumber,
      location,
    };
    this.mockCustomers.set(phoneNumber, newCustomer);
    return newCustomer;
  }

  public async createEvent(record: EventRecord): Promise<EventRecord> {
    if (this.base) {
      try {
        const table = this.configService.get<string>('airtable.tables.events') ?? 'Events';
        const created = await this.base(table).create([
          {
            fields: {
              'Event Type': record.eventType,
              'Event Date': record.eventDate,
              'Guest Count': record.guestCount,
              'Delivery Address': record.deliveryAddress,
              Status: record.status,
            },
          },
        ]);
        return { ...record, id: created[0].id };
      } catch (err: unknown) {
        const error = err as Error;
        this.logger.error(`Airtable createEvent error: ${error.message}`);
      }
    }

    const eventId = `EVT-${Date.now().toString().slice(-4)}`;
    const savedEvent = { ...record, id: eventId };
    this.mockEvents.set(eventId, savedEvent);
    this.logger.log(`Created Event ${eventId} for customer ${record.customerId}`);
    return savedEvent;
  }

  public async createOrder(record: OrderRecord): Promise<OrderRecord> {
    if (this.base) {
      try {
        const table = this.configService.get<string>('airtable.tables.orders') ?? 'Orders';
        const created = await this.base(table).create([
          {
            fields: {
              'Order Status': record.orderStatus,
              'Estimated Total': record.estimatedTotal,
              'Items Summary': record.itemsSummary,
              'Special Instructions': record.specialInstructions || '',
            },
          },
        ]);
        return { ...record, id: created[0].id };
      } catch (err: unknown) {
        const error = err as Error;
        this.logger.error(`Airtable createOrder error: ${error.message}`);
      }
    }

    const orderId = `ORD-${Date.now().toString().slice(-4)}`;
    const savedOrder = { ...record, id: orderId };
    this.mockOrders.set(orderId, savedOrder);
    this.logger.log(`Created Confirmed Order ${orderId}: £${record.estimatedTotal}`);
    return savedOrder;
  }

  public async markHumanHandoffRequired(phoneNumber: string, reason: string): Promise<void> {
    this.logger.warn(`[HUMAN_HANDOFF_TRIGGERED] Phone: ${phoneNumber} | Reason: ${reason}`);
    // In production, update Airtable Conversations table status to HUMAN_REQUIRED
  }
}
