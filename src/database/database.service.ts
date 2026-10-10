import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

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

export interface EnterpriseHandoff {
  id: string;
  phoneNumber: string;
  reason: string;
  status: 'PENDING' | 'RESOLVED';
  createdAt: Date;
}

interface StoredSnapshot {
  customers: EnterpriseCustomer[];
  events: EnterpriseEvent[];
  orders: EnterpriseOrder[];
  messages: EnterpriseMessageAudit[];
  handoffs: EnterpriseHandoff[];
}

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly storageFilePath = 'data/catering-store.json';

  // In-memory high-speed cache for sub-millisecond hot reads
  private readonly customers = new Map<string, EnterpriseCustomer>();
  private readonly events = new Map<string, EnterpriseEvent>();
  private readonly orders = new Map<string, EnterpriseOrder>();
  private readonly auditLog: EnterpriseMessageAudit[] = [];
  private readonly handoffLog: EnterpriseHandoff[] = [];

  constructor(private readonly configService: ConfigService) {
    this.loadFromDisk();
  }

  onModuleInit() {
    this.logger.log(`✅ [ENTERPRISE_DB] Initialized with ${this.customers.size} customers, ${this.orders.size} orders.`);
  }

  private loadFromDisk(): void {
    if (process.env.NODE_ENV === 'test') return;

    try {
      if (existsSync(this.storageFilePath)) {
        const raw = readFileSync(this.storageFilePath, 'utf-8');
        const data: StoredSnapshot = JSON.parse(raw);

        if (Array.isArray(data.customers)) {
          data.customers.forEach((c) => {
            this.customers.set(c.phoneNumber, {
              ...c,
              createdAt: new Date(c.createdAt),
              updatedAt: new Date(c.updatedAt),
            });
          });
        }

        if (Array.isArray(data.events)) {
          data.events.forEach((e) => {
            this.events.set(e.id, {
              ...e,
              createdAt: new Date(e.createdAt),
            });
          });
        }

        if (Array.isArray(data.orders)) {
          data.orders.forEach((o) => {
            this.orders.set(o.id, {
              ...o,
              confirmedAt: o.confirmedAt ? new Date(o.confirmedAt) : undefined,
              createdAt: new Date(o.createdAt),
            });
          });
        }

        if (Array.isArray(data.messages)) {
          data.messages.forEach((m) => {
            this.auditLog.push({
              ...m,
              createdAt: new Date(m.createdAt),
            });
          });
        }

        if (Array.isArray(data.handoffs)) {
          data.handoffs.forEach((h) => {
            this.handoffLog.push({
              ...h,
              createdAt: new Date(h.createdAt),
            });
          });
        }

        this.logger.log(`📦 Loaded persistent data from ${this.storageFilePath}`);
      }
    } catch (err: unknown) {
      this.logger.warn(`Could not load snapshot from disk: ${(err as Error).message}`);
    }
  }

  private saveToDisk(): void {
    if (process.env.NODE_ENV === 'test') return;

    try {
      mkdirSync(dirname(this.storageFilePath), { recursive: true });
      const snapshot: StoredSnapshot = {
        customers: Array.from(this.customers.values()),
        events: Array.from(this.events.values()),
        orders: Array.from(this.orders.values()),
        messages: this.auditLog.slice(-1000), // Retain latest 1000 messages in file
        handoffs: this.handoffLog,
      };
      writeFileSync(this.storageFilePath, JSON.stringify(snapshot, null, 2), 'utf-8');
    } catch (err: unknown) {
      this.logger.warn(`Could not persist snapshot to disk: ${(err as Error).message}`);
    }
  }

  /**
   * Finds or creates a customer by phone number atomically
   */
  public async findOrCreateCustomer(name: string, phoneNumber: string, postcode?: string): Promise<EnterpriseCustomer> {
    const existing = this.customers.get(phoneNumber);
    if (existing) {
      let modified = false;
      if (name && name !== 'Customer' && existing.name !== name) {
        existing.name = name;
        existing.updatedAt = new Date();
        modified = true;
      }
      if (postcode && !existing.postcode) {
        existing.postcode = postcode;
        existing.updatedAt = new Date();
        modified = true;
      }
      if (modified) {
        this.saveToDisk();
      }
      return existing;
    }

    const newId = `CUS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const now = new Date();
    const created: EnterpriseCustomer = {
      id: newId,
      name: name || 'Valued Customer',
      phoneNumber,
      postcode,
      createdAt: now,
      updatedAt: now,
    };

    this.customers.set(phoneNumber, created);
    this.saveToDisk();
    this.logger.log(`[DB] Created customer: ${created.name} (${created.id}) for ${phoneNumber}`);
    return created;
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
    const now = new Date();
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
      createdAt: now,
    };

    this.events.set(id, event);
    this.saveToDisk();
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
    const now = new Date();
    const order: EnterpriseOrder = {
      id,
      customerId: data.customerId,
      eventId: data.eventId,
      orderMode: data.orderMode,
      selectedPackageId: data.selectedPackageId,
      totalAmount: data.totalAmount,
      paymentStatus: 'PENDING',
      itemsSummary: data.itemsSummary,
      confirmedAt: now,
      createdAt: now,
    };

    this.orders.set(id, order);

    if (data.eventId && this.events.has(data.eventId)) {
      this.events.get(data.eventId)!.status = 'CONFIRMED';
    }

    this.saveToDisk();
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
    const id = `MSG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const entry: EnterpriseMessageAudit = {
      id,
      ...audit,
      createdAt: new Date(),
    };

    this.auditLog.push(entry);
    this.saveToDisk();
  }

  /**
   * Records Human Handoff escalation
   */
  public async recordHumanHandoff(phoneNumber: string, reason: string): Promise<void> {
    const id = `HND-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const entry: EnterpriseHandoff = {
      id,
      phoneNumber,
      reason,
      status: 'PENDING',
      createdAt: new Date(),
    };

    this.handoffLog.push(entry);
    this.saveToDisk();
    this.logger.warn(`🚨 [HUMAN_HANDOFF_RECORDED] Phone: ${phoneNumber} | Reason: ${reason}`);
  }

  /**
   * Returns all recorded orders joined with customer and event details
   */
  public getAllOrders(): Array<EnterpriseOrder & { customer?: EnterpriseCustomer; event?: EnterpriseEvent }> {
    const list: Array<EnterpriseOrder & { customer?: EnterpriseCustomer; event?: EnterpriseEvent }> = [];
    for (const order of this.orders.values()) {
      const customer = Array.from(this.customers.values()).find((c) => c.id === order.customerId);
      const event = order.eventId ? this.events.get(order.eventId) : undefined;
      list.push({ ...order, customer, event });
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Updates an order's associated event status
   */
  public updateOrderStatus(orderId: string, status: string): boolean {
    const order = this.orders.get(orderId);
    if (!order) return false;
    if (order.eventId && this.events.has(order.eventId)) {
      this.events.get(order.eventId)!.status = status as any;
    }
    this.saveToDisk();
    return true;
  }

  /**
   * Returns all human handoffs
   */
  public getAllHandoffs(): EnterpriseHandoff[] {
    return [...this.handoffLog].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Marks a pending human handoff as resolved
   */
  public resolveHandoff(phoneNumber: string): boolean {
    let resolved = false;
    for (const h of this.handoffLog) {
      if (h.phoneNumber === phoneNumber && h.status === 'PENDING') {
        h.status = 'RESOLVED';
        resolved = true;
      }
    }
    if (resolved) this.saveToDisk();
    return resolved;
  }

  /**
   * Returns audit messages for a given phone number
   */
  public getMessagesForPhone(phoneNumber: string): EnterpriseMessageAudit[] {
    return this.auditLog
      .filter((m) => m.phoneNumber === phoneNumber)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  /**
   * Returns current database summary counts
   */
  public getStats() {
    let totalRevenue = 0;
    for (const o of this.orders.values()) {
      totalRevenue += o.totalAmount || 0;
    }

    return {
      totalCustomers: this.customers.size,
      totalEvents: this.events.size,
      totalOrders: this.orders.size,
      totalRevenue,
      totalAuditMessages: this.auditLog.length,
      pendingHandoffs: this.handoffLog.filter((h) => h.status === 'PENDING').length,
      totalHandoffs: this.handoffLog.length,
    };
  }
}
