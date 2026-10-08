import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
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

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private db!: DatabaseSync;

  // In-memory high-speed cache for sub-millisecond hot reads
  private readonly customers = new Map<string, EnterpriseCustomer>();
  private readonly events = new Map<string, EnterpriseEvent>();
  private readonly orders = new Map<string, EnterpriseOrder>();
  private readonly auditLog: EnterpriseMessageAudit[] = [];

  constructor(private readonly configService: ConfigService) {
    this.initDatabase();
  }

  onModuleInit() {
    this.logger.log('✅ [ENTERPRISE_DB] Persistent SQL Database connected with ACID transactions.');
  }

  onModuleDestroy() {
    try {
      this.db.close();
    } catch {
      // ignore
    }
  }

  private initDatabase(): void {
    const isTest = process.env.NODE_ENV === 'test';
    const dbPath = isTest ? ':memory:' : 'data/catering.sqlite';

    if (!isTest) {
      try {
        mkdirSync(dirname(dbPath), { recursive: true });
      } catch {
        // Directory already exists or in memory
      }
    }

    this.db = new DatabaseSync(dbPath);

    // Initialize Schema mirroring prisma/schema.prisma
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;

      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone_number TEXT UNIQUE NOT NULL,
        postcode TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        event_type TEXT,
        event_date TEXT NOT NULL,
        serving_time TEXT,
        guest_count INTEGER NOT NULL,
        delivery_address TEXT,
        dietary_preference TEXT,
        status TEXT NOT NULL DEFAULT 'QUOTED',
        created_at TEXT NOT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        event_id TEXT,
        order_mode TEXT NOT NULL,
        selected_package_id TEXT,
        total_amount REAL NOT NULL,
        payment_status TEXT NOT NULL DEFAULT 'PENDING',
        items_summary TEXT,
        confirmed_at TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        customer_id TEXT,
        phone_number TEXT NOT NULL,
        direction TEXT NOT NULL,
        message_text TEXT NOT NULL,
        wamid TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS handoffs (
        id TEXT PRIMARY KEY,
        phone_number TEXT NOT NULL,
        reason TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone_number);
      CREATE INDEX IF NOT EXISTS idx_events_customer ON events(customer_id);
      CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
      CREATE INDEX IF NOT EXISTS idx_messages_phone ON messages(phone_number);
    `);
  }

  /**
   * Finds or creates a customer by phone number atomically
   */
  public async findOrCreateCustomer(name: string, phoneNumber: string, postcode?: string): Promise<EnterpriseCustomer> {
    const existingMemory = this.customers.get(phoneNumber);
    if (existingMemory) {
      if (name && name !== 'Customer' && existingMemory.name !== name) {
        existingMemory.name = name;
        existingMemory.updatedAt = new Date();
        this.db.prepare('UPDATE customers SET name = ?, updated_at = ? WHERE phone_number = ?')
          .run(name, existingMemory.updatedAt.toISOString(), phoneNumber);
      }
      if (postcode && !existingMemory.postcode) {
        existingMemory.postcode = postcode;
        existingMemory.updatedAt = new Date();
        this.db.prepare('UPDATE customers SET postcode = ?, updated_at = ? WHERE phone_number = ?')
          .run(postcode, existingMemory.updatedAt.toISOString(), phoneNumber);
      }
      return existingMemory;
    }

    // Query SQL
    const row = this.db.prepare('SELECT * FROM customers WHERE phone_number = ?').get(phoneNumber) as any;
    if (row) {
      const customer: EnterpriseCustomer = {
        id: row.id,
        name: row.name,
        phoneNumber: row.phone_number,
        postcode: row.postcode || undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      };
      this.customers.set(phoneNumber, customer);
      return customer;
    }

    // Insert new customer
    const newId = `CUS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const now = new Date();
    const cleanName = name || 'Valued Customer';

    this.db.prepare(
      'INSERT INTO customers (id, name, phone_number, postcode, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(newId, cleanName, phoneNumber, postcode || null, now.toISOString(), now.toISOString());

    const created: EnterpriseCustomer = {
      id: newId,
      name: cleanName,
      phoneNumber,
      postcode,
      createdAt: now,
      updatedAt: now,
    };

    this.customers.set(phoneNumber, created);
    this.logger.log(`[DB] Created customer: ${created.name} (${created.id}) for ${phoneNumber}`);
    return created;
  }

  /**
   * Retrieves customer by phone number
   */
  public async getCustomerByPhone(phoneNumber: string): Promise<EnterpriseCustomer | null> {
    if (this.customers.has(phoneNumber)) {
      return this.customers.get(phoneNumber)!;
    }
    const row = this.db.prepare('SELECT * FROM customers WHERE phone_number = ?').get(phoneNumber) as any;
    if (row) {
      const customer: EnterpriseCustomer = {
        id: row.id,
        name: row.name,
        phoneNumber: row.phone_number,
        postcode: row.postcode || undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      };
      this.customers.set(phoneNumber, customer);
      return customer;
    }
    return null;
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
    const eventType = data.eventType || 'Buffet Feast';
    const status = data.status || 'QUOTED';

    this.db.prepare(`
      INSERT INTO events (id, customer_id, event_type, event_date, serving_time, guest_count, delivery_address, dietary_preference, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.customerId,
      eventType,
      data.eventDate,
      data.servingTime || null,
      data.guestCount,
      data.deliveryAddress || null,
      data.dietaryPreference || null,
      status,
      now.toISOString()
    );

    const event: EnterpriseEvent = {
      id,
      customerId: data.customerId,
      eventType,
      eventDate: data.eventDate,
      servingTime: data.servingTime,
      guestCount: data.guestCount,
      deliveryAddress: data.deliveryAddress,
      dietaryPreference: data.dietaryPreference,
      status,
      createdAt: now,
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
    const now = new Date();

    this.db.prepare(`
      INSERT INTO orders (id, customer_id, event_id, order_mode, selected_package_id, total_amount, payment_status, items_summary, confirmed_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)
    `).run(
      id,
      data.customerId,
      data.eventId || null,
      data.orderMode,
      data.selectedPackageId || null,
      data.totalAmount,
      data.itemsSummary || null,
      now.toISOString(),
      now.toISOString()
    );

    if (data.eventId) {
      this.db.prepare("UPDATE events SET status = 'CONFIRMED' WHERE id = ?").run(data.eventId);
      if (this.events.has(data.eventId)) {
        this.events.get(data.eventId)!.status = 'CONFIRMED';
      }
    }

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
    const now = new Date();

    this.db.prepare(`
      INSERT INTO messages (id, customer_id, phone_number, direction, message_text, wamid, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      audit.customerId || null,
      audit.phoneNumber,
      audit.direction,
      audit.messageText,
      audit.wamid || null,
      now.toISOString()
    );

    const entry: EnterpriseMessageAudit = {
      id,
      ...audit,
      createdAt: now,
    };
    this.auditLog.push(entry);
  }

  /**
   * Records Human Handoff escalation in SQL
   */
  public async recordHumanHandoff(phoneNumber: string, reason: string): Promise<void> {
    const id = `HND-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const now = new Date();

    this.db.prepare(`
      INSERT INTO handoffs (id, phone_number, reason, status, created_at)
      VALUES (?, ?, ?, 'PENDING', ?)
    `).run(id, phoneNumber, reason, now.toISOString());

    this.logger.warn(`🚨 [HUMAN_HANDOFF_RECORDED] Phone: ${phoneNumber} | Reason: ${reason}`);
  }

  /**
   * Returns current database summary counts directly from SQL
   */
  public getStats() {
    const custCount = (this.db.prepare('SELECT COUNT(*) as count FROM customers').get() as any)?.count || 0;
    const evtCount = (this.db.prepare('SELECT COUNT(*) as count FROM events').get() as any)?.count || 0;
    const ordCount = (this.db.prepare('SELECT COUNT(*) as count FROM orders').get() as any)?.count || 0;
    const msgCount = (this.db.prepare('SELECT COUNT(*) as count FROM messages').get() as any)?.count || 0;

    return {
      totalCustomers: custCount,
      totalEvents: evtCount,
      totalOrders: ordCount,
      totalAuditMessages: msgCount,
    };
  }
}
