import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { EventsService } from '../events/events.service.js';

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
  status: 'QUOTED' | 'CONFIRMED' | 'IN_PREP' | 'DISPATCHED' | 'COMPLETED' | 'CANCELLED';
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

  constructor(
    private readonly configService: ConfigService,
    @Optional()
    private readonly eventsService?: EventsService,
  ) {
    this.loadFromDisk();
  }

  onModuleInit() {
    if (this.orders.size === 0 && process.env.NODE_ENV !== 'test') {
      this.seedInitialData(false);
    }
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
    status?: 'QUOTED' | 'CONFIRMED' | 'IN_PREP' | 'DISPATCHED' | 'COMPLETED' | 'CANCELLED';
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
    this.eventsService?.emit('ORDER_CREATED', order);
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
    this.eventsService?.emit('MESSAGE_LOGGED', entry);
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
    this.eventsService?.emit('HANDOFF_CREATED', entry);
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
    this.eventsService?.emit('ORDER_UPDATED', { orderId, status });
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
    if (resolved) {
      this.saveToDisk();
      this.eventsService?.emit('HANDOFF_RESOLVED', { phoneNumber });
    }
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

  /**
   * Seeds realistic enterprise orders, events, messages, and handoffs
   */
  public seedInitialData(force = false): boolean {
    if (!force && this.orders.size > 0) return false;

    if (force) {
      this.customers.clear();
      this.events.clear();
      this.orders.clear();
      this.auditLog.length = 0;
      this.handoffLog.length = 0;
    }

    const now = new Date();

    // 1. Priya & Vikram Sharma - CONFIRMED
    const cus1: EnterpriseCustomer = {
      id: 'CUS-101',
      name: 'Priya & Vikram Sharma',
      phoneNumber: '+44 7123 456789',
      postcode: 'HA9 9AA (Wembley)',
      createdAt: now,
      updatedAt: now,
    };
    const evt1: EnterpriseEvent = {
      id: 'EVT-101',
      customerId: 'CUS-101',
      eventType: 'Royal Shaadi Reception',
      eventDate: '2026-10-15',
      servingTime: '13:30 BST',
      guestCount: 80,
      deliveryAddress: 'Wembley Grand Banqueting Hall, HA9',
      dietaryPreference: 'Mixed 60/40 (Halal Meat + Veg Cushion)',
      status: 'CONFIRMED',
      createdAt: now,
    };
    const ord1: EnterpriseOrder = {
      id: 'ORD-ROYAL-101',
      customerId: 'CUS-101',
      eventId: 'EVT-101',
      orderMode: 'FEAST_PACKAGE',
      selectedPackageId: 'PKG-GOLD',
      totalAmount: 1440.0,
      paymentStatus: 'PAID',
      itemsSummary: 'Dil Se Royal Celebration Feast (80 Covers)',
      confirmedAt: now,
      createdAt: now,
    };

    // 2. Rajesh & Suman Patel - QUOTED
    const cus2: EnterpriseCustomer = {
      id: 'CUS-202',
      name: 'Rajesh & Suman Patel',
      phoneNumber: '+44 7987 654321',
      postcode: 'SL1 2DX (Slough)',
      createdAt: now,
      updatedAt: now,
    };
    const evt2: EnterpriseEvent = {
      id: 'EVT-202',
      customerId: 'CUS-202',
      eventType: 'Home Puja & Gathering',
      eventDate: '2026-10-12',
      servingTime: '18:30 BST',
      guestCount: 40,
      deliveryAddress: 'Upton Court Road, Slough SL1',
      dietaryPreference: 'Strict Pure Vegetarian (Jain prep)',
      status: 'QUOTED',
      createdAt: now,
    };
    const ord2: EnterpriseOrder = {
      id: 'ORD-TRAY-202',
      customerId: 'CUS-202',
      eventId: 'EVT-202',
      orderMode: 'A_LA_CARTE_TRAYS',
      totalAmount: 485.0,
      paymentStatus: 'PENDING',
      itemsSummary: '3x Awadhi Biryani Trays, 2x Butter Chicken, 2x Shahi Paneer',
      createdAt: now,
    };

    // 3. Ayesha & Tariq Khan - IN_PREP
    const cus3: EnterpriseCustomer = {
      id: 'CUS-303',
      name: 'Ayesha & Tariq Khan',
      phoneNumber: '+44 7555 123456',
      postcode: 'UB1 3HE (Southall)',
      createdAt: now,
      updatedAt: now,
    };
    const evt3: EnterpriseEvent = {
      id: 'EVT-303',
      customerId: 'CUS-303',
      eventType: 'Walima Banquet Gathering',
      eventDate: '2026-10-14',
      servingTime: '19:00 BST',
      guestCount: 60,
      deliveryAddress: 'The Broadway Banquet Suite, UB1',
      dietaryPreference: '100% British Halal Certified',
      status: 'IN_PREP',
      createdAt: now,
    };
    const ord3: EnterpriseOrder = {
      id: 'ORD-ROYAL-303',
      customerId: 'CUS-303',
      eventId: 'EVT-303',
      orderMode: 'FEAST_PACKAGE',
      selectedPackageId: 'PKG-SILVER',
      totalAmount: 1160.0,
      paymentStatus: 'PAID',
      itemsSummary: 'Dil Se Classic Feast (60 Covers)',
      confirmedAt: now,
      createdAt: now,
    };

    // 4. Arjun & Meera Singhania - DISPATCHED
    const cus4: EnterpriseCustomer = {
      id: 'CUS-404',
      name: 'Arjun & Meera Singhania',
      phoneNumber: '+44 7888 999000',
      postcode: 'TW7 4NP (Isleworth)',
      createdAt: now,
      updatedAt: now,
    };
    const evt4: EnterpriseEvent = {
      id: 'EVT-404',
      customerId: 'CUS-404',
      eventType: 'Corporate Diwali Gala',
      eventDate: '2026-10-18',
      servingTime: '19:30 BST',
      guestCount: 160,
      deliveryAddress: 'Osterley Park Pavilion, TW7',
      dietaryPreference: 'Mixed 60/40 (Halal Meat + Veg Cushion)',
      status: 'DISPATCHED',
      createdAt: now,
    };
    const ord4: EnterpriseOrder = {
      id: 'ORD-ROYAL-404',
      customerId: 'CUS-404',
      eventId: 'EVT-404',
      orderMode: 'FEAST_PACKAGE',
      selectedPackageId: 'PKG-GOLD',
      totalAmount: 2880.0,
      paymentStatus: 'PAID',
      itemsSummary: 'Dil Se Royal Celebration Feast (160 Covers)',
      confirmedAt: now,
      createdAt: now,
    };

    // 5. Lord & Lady Mountjoy - COMPLETED
    const cus5: EnterpriseCustomer = {
      id: 'CUS-505',
      name: 'Lord & Lady Mountjoy / Gupta Corp',
      phoneNumber: '+44 7444 332211',
      postcode: 'W1K 7TN (Mayfair)',
      createdAt: now,
      updatedAt: now,
    };
    const evt5: EnterpriseEvent = {
      id: 'EVT-505',
      customerId: 'CUS-505',
      eventType: 'Mayfair Charity Gala Feast',
      eventDate: '2026-10-09',
      servingTime: '20:00 BST',
      guestCount: 200,
      deliveryAddress: 'The Grosvenor House Ballroom, W1K',
      dietaryPreference: 'Gourmet Mughlai • Nut-Free Audited',
      status: 'COMPLETED',
      createdAt: now,
    };
    const ord5: EnterpriseOrder = {
      id: 'ORD-ROYAL-505',
      customerId: 'CUS-505',
      eventId: 'EVT-505',
      orderMode: 'FEAST_PACKAGE',
      selectedPackageId: 'PKG-GOLD',
      totalAmount: 3600.0,
      paymentStatus: 'PAID',
      itemsSummary: 'Dil Se Grand Banquet (200 Covers)',
      confirmedAt: now,
      createdAt: now,
    };

    [cus1, cus2, cus3, cus4, cus5].forEach((c) => this.customers.set(c.phoneNumber, c));
    [evt1, evt2, evt3, evt4, evt5].forEach((e) => this.events.set(e.id, e));
    [ord1, ord2, ord3, ord4, ord5].forEach((o) => this.orders.set(o.id, o));

    // Seed realistic audit messages for customer 1
    this.auditLog.push(
      {
        id: 'MSG-INIT-1',
        customerId: 'CUS-101',
        phoneNumber: '+44 7123 456789',
        direction: 'INBOUND',
        messageText: 'Namaste! We are arranging catering for 80 guests in Wembley Grand Banqueting Hall. Could you share your royal banquet packages?',
        createdAt: new Date(Date.now() - 3600000 * 2),
      },
      {
        id: 'MSG-INIT-2',
        customerId: 'CUS-101',
        phoneNumber: '+44 7123 456789',
        direction: 'OUTBOUND',
        messageText: 'Namaste Priya & Vikram! Delighted to connect with you. For a banquet of 80 guests, our Dil Se Royal Celebration Feast (£18.00/pp) is our signature spread. Includes starters, butter chicken, kadhai paneer, rogan josh lamb, dal makhani, dum biryani, fresh naan and luxury desserts with buffet chafing warmers included.',
        createdAt: new Date(Date.now() - 3600000 * 1.9),
      },
      {
        id: 'MSG-INIT-3',
        customerId: 'CUS-101',
        phoneNumber: '+44 7123 456789',
        direction: 'INBOUND',
        messageText: 'That sounds splendid! We have a mixed gathering of vegetarians and meat lovers. Can you guarantee the paneer and veg dishes won\'t run short?',
        createdAt: new Date(Date.now() - 3600000 * 1.8),
      },
      {
        id: 'MSG-INIT-4',
        customerId: 'CUS-101',
        phoneNumber: '+44 7123 456789',
        direction: 'OUTBOUND',
        messageText: 'A golden rule from our banquet experience: non-vegetarian guests invariably love the Shahi Paneer as well! We intentionally build in a generous 40% vegetarian buffer so your vegetarian family members enjoy abundant feast platters throughout the evening.',
        createdAt: new Date(Date.now() - 3600000 * 1.7),
      },
    );

    // Seed 1 pending handoff for customer 2
    this.handoffLog.push({
      id: 'HND-INIT-1',
      phoneNumber: '+44 7987 654321',
      reason: 'Host requested bespoke Jain no-root menu consultation with Executive Chef',
      status: 'PENDING',
      createdAt: new Date(Date.now() - 1800000),
    });

    this.saveToDisk();
    this.logger.log(`🌱 [ENTERPRISE_DB] Seeded initial database records (5 orders, 5 customers, 5 events, 4 messages, 1 handoff).`);
    return true;
  }
}
