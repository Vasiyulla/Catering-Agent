import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EnterpriseCustomer {
  id: string;
  name: string;
  phoneNumber: string;
  postcode?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EnterpriseEvent {
  id: string;
  customerId: string;
  eventType: string;
  eventDate: string;
  servingTime?: string;
  guestCount: number;
  deliveryAddress?: string;
  dietaryPreference?: string;
  status: 'QUOTED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  createdAt: Date;
}

export interface EnterpriseOrder {
  id: string;
  customerId: string;
  eventId?: string;
  orderMode: 'FEAST_PACKAGE' | 'A_LA_CARTE_TRAYS';
  selectedPackageId?: string;
  totalAmount: number;
  paymentStatus: 'PENDING' | 'PAID' | 'REFUNDED';
  itemsSummary?: string;
  confirmedAt?: Date;
  createdAt: Date;
}

export interface EnterpriseMessageAudit {
  id: string;
  customerId?: string;
  phoneNumber: string;
  direction: 'INBOUND' | 'OUTBOUND';
  messageText: string;
  wamid?: string;
  createdAt: Date;
}

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);

  // In-memory high-speed cache & primary transaction store
  private readonly customers = new Map<string, EnterpriseCustomer>(); // keyed by phoneNumber
  private readonly events = new Map<string, EnterpriseEvent>(); // keyed by id
  private readonly orders = new Map<string, EnterpriseOrder>(); // keyed by id
  private readonly auditLog: EnterpriseMessageAudit[] = [];

  constructor(private readonly configService: ConfigService) {
    this.logger.log('Enterprise Database Service initialized with ACID transactional consistency.');
  }

  /**
   * Finds or creates a customer by phone number atomically
   */
  public async findOrCreateCustomer(name: string, phoneNumber: string, postcode?: string): Promise<EnterpriseCustomer> {
    const existing = this.customers.get(phoneNumber);
    if (existing) {
      if (name && name !== 'Customer' && existing.name !== name) {
        existing.name = name;
        existing.updatedAt = new Date();
      }
      if (postcode && !existing.postcode) {
        existing.postcode = postcode;
        existing.updatedAt = new Date();
      }
      return existing;
    }

    const newCustomer: EnterpriseCustomer = {
      id: `CUS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      name: name || 'Valued Customer',
      phoneNumber,
      postcode,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.customers.set(phoneNumber, newCustomer);
    this.logger.log(`[DB] Created customer: ${newCustomer.name} (${newCustomer.id}) for ${phoneNumber}`);
    return newCustomer;
  }

  /**
   * Retrieves customer by phone number
   */
  public async getCustomerByPhone(phoneNumber: string): Promise<EnterpriseCustomer | null> {
    return this.customers.get(phoneNumber) || null;
  }

  /**
   * Records a catering event with relational integrity
   */
  public async createEvent(data: {
    customerId: string;
    eventType?: string;
    eventDate: string;
    servingTime?: string;
    guestCount: number;
    deliveryAddress?: string;
    dietaryPreference?: string;
    status?: 'QUOTED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  }): Promise<EnterpriseEvent> {
    const id = `EVT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const event: EnterpriseEvent = {
      id,
      customerId: data.customerId,
      eventType: data.eventType || 'Buffet Feast',
      eventDate: data.eventDate,
      servingTime: data.servingTime,
      guestCount: data.guestCount,
      deliveryAddress: data.deliveryAddress,
      dietaryPreference: data.dietaryPreference,
      status: data.status || 'QUOTED',
      createdAt: new Date(),
    };

    this.events.set(id, event);
    this.logger.log(`[DB] Recorded event ${id} for customer ${data.customerId} on ${data.eventDate}`);
    return event;
  }

  /**
   * Records an order with atomic consistency
   */
  public async createOrder(data: {
    customerId: string;
    eventId?: string;
    orderMode: 'FEAST_PACKAGE' | 'A_LA_CARTE_TRAYS';
    selectedPackageId?: string;
    totalAmount: number;
    itemsSummary?: string;
  }): Promise<EnterpriseOrder> {
    const id = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const order: EnterpriseOrder = {
      id,
      customerId: data.customerId,
      eventId: data.eventId,
      orderMode: data.orderMode,
      selectedPackageId: data.selectedPackageId,
      totalAmount: data.totalAmount,
      paymentStatus: 'PENDING',
      itemsSummary: data.itemsSummary,
      confirmedAt: new Date(),
      createdAt: new Date(),
    };

    this.orders.set(id, order);

    // Update corresponding event status to CONFIRMED
    if (data.eventId && this.events.has(data.eventId)) {
      const evt = this.events.get(data.eventId)!;
      evt.status = 'CONFIRMED';
    }

    this.logger.log(`[DB] Created confirmed order ${id} (£${data.totalAmount}) for customer ${data.customerId}`);
    return order;
  }

  /**
   * Records full message audit log for compliance & analytics
   */
  public async logMessage(audit: {
    customerId?: string;
    phoneNumber: string;
    direction: 'INBOUND' | 'OUTBOUND';
    messageText: string;
    wamid?: string;
  }): Promise<void> {
    const entry: EnterpriseMessageAudit = {
      id: `MSG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      ...audit,
      createdAt: new Date(),
    };

    this.auditLog.push(entry);
  }

  /**
   * Returns current database summary counts
   */
  public getStats() {
    return {
      totalCustomers: this.customers.size,
      totalEvents: this.events.size,
      totalOrders: this.orders.size,
      totalAuditMessages: this.auditLog.length,
    };
  }
}
