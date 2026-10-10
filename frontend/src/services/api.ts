import {
  CateringPackage,
  MenuItem,
  EnterpriseOrder,
  EnterpriseHandoff,
  EnterpriseMessage,
  DashboardStats,
  QuoteCalculationResult,
  HostProtectionAudit,
} from '../types/index.ts';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export const api = {
  /**
   * Fetches live menu packages and bulk party trays directly from backend
   */
  async getMenu(): Promise<{ packages: CateringPackage[]; items: MenuItem[] }> {
    try {
      const res = await fetch(`${API_BASE}/menu`);
      if (!res.ok) {
        throw new Error(`Menu API responded with status ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      console.error('[API] Failed to fetch live menu from backend:', err);
      return { packages: [], items: [] };
    }
  },

  /**
   * Calculates dynamic catering quote and host-protection audit via backend engine
   */
  async calculateQuote(payload: {
    orderMode?: 'FEAST_PACKAGE' | 'A_LA_CARTE_TRAYS';
    packageId?: string;
    guestCount?: number;
    postcode?: string;
    dietaryPreference?: string;
    trayItems?: Array<{ dishQuery: string; quantity: number }>;
  }): Promise<{ quote: QuoteCalculationResult; hostProtection: HostProtectionAudit }> {
    const res = await fetch(`${API_BASE}/calculator/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`Quote calculation failed with status ${res.status}`);
    }
    return await res.json();
  },

  /**
   * Fetches all live enterprise orders from backend database
   */
  async getOrders(): Promise<{ orders: EnterpriseOrder[] }> {
    try {
      const res = await fetch(`${API_BASE}/orders`);
      if (!res.ok) {
        throw new Error(`Orders API responded with status ${res.status}`);
      }
      const data = await res.json();
      return { orders: Array.isArray(data.orders) ? data.orders : [] };
    } catch (err) {
      console.error('[API] Failed to fetch live orders:', err);
      return { orders: [] };
    }
  },

  /**
   * Direct order creation with customer and event relational binding
   */
  async createOrder(orderData: {
    customerName: string;
    phoneNumber: string;
    postcode?: string;
    eventType?: string;
    eventDate?: string;
    servingTime?: string;
    guestCount?: number;
    deliveryAddress?: string;
    dietaryPreference?: string;
    orderMode?: 'FEAST_PACKAGE' | 'A_LA_CARTE_TRAYS';
    packageId?: string;
    totalAmount?: number;
    itemsSummary?: string;
  }): Promise<{ success: boolean; order?: EnterpriseOrder }> {
    try {
      const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });
      if (!res.ok) throw new Error(`Create order failed with status ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('[API] Failed to create order:', err);
      return { success: false };
    }
  },

  /**
   * Updates an order's status on the backend
   */
  async updateOrderStatus(orderId: string, status: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      return res.ok;
    } catch (err) {
      console.error(`[API] Failed to update status for order ${orderId}:`, err);
      return false;
    }
  },

  /**
   * Fetches all live human handoff escalations from backend
   */
  async getHandoffs(): Promise<{ handoffs: EnterpriseHandoff[] }> {
    try {
      const res = await fetch(`${API_BASE}/handoffs`);
      if (!res.ok) {
        throw new Error(`Handoffs API responded with status ${res.status}`);
      }
      const data = await res.json();
      return { handoffs: Array.isArray(data.handoffs) ? data.handoffs : [] };
    } catch (err) {
      console.error('[API] Failed to fetch live handoffs:', err);
      return { handoffs: [] };
    }
  },

  /**
   * Resolves a pending human handoff on the backend
   */
  async resolveHandoff(phoneNumber: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/handoffs/${encodeURIComponent(phoneNumber)}/resolve`, {
        method: 'POST',
      });
      return res.ok;
    } catch (err) {
      console.error(`[API] Failed to resolve handoff for ${phoneNumber}:`, err);
      return false;
    }
  },

  /**
   * Fetches real message transcript for a given customer phone number
   */
  async getMessages(phoneNumber: string): Promise<{ messages: EnterpriseMessage[] }> {
    try {
      const res = await fetch(`${API_BASE}/messages/${encodeURIComponent(phoneNumber)}`);
      if (!res.ok) {
        throw new Error(`Messages API responded with status ${res.status}`);
      }
      const data = await res.json();
      return { messages: Array.isArray(data.messages) ? data.messages : [] };
    } catch (err) {
      console.error(`[API] Failed to fetch messages for ${phoneNumber}:`, err);
      return { messages: [] };
    }
  },

  /**
   * Dispatches and records an outbound manual reply from dashboard staff
   */
  async sendMessage(phoneNumber: string, messageText: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/messages/${encodeURIComponent(phoneNumber)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageText }),
      });
      return res.ok;
    } catch (err) {
      console.error(`[API] Failed to send message to ${phoneNumber}:`, err);
      return false;
    }
  },

  /**
   * Fetches live dashboard stats from backend
   */
  async getStats(): Promise<DashboardStats> {
    try {
      const res = await fetch(`${API_BASE}/stats`);
      if (!res.ok) {
        throw new Error(`Stats API responded with status ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      console.error('[API] Failed to fetch live stats:', err);
      return {
        totalCustomers: 0,
        totalEvents: 0,
        totalOrders: 0,
        totalRevenue: 0,
        pendingHandoffs: 0,
        totalHandoffs: 0,
      };
    }
  },

  /**
   * Seeds / resets canonical enterprise records on the backend
   */
  async seedDatabase(force = false): Promise<{ success: boolean; stats?: DashboardStats }> {
    try {
      const res = await fetch(`${API_BASE}/seed?force=${force ? 'true' : 'false'}`, {
        method: 'POST',
      });
      return await res.json();
    } catch (err) {
      console.error('[API] Seed database request failed:', err);
      return { success: false };
    }
  },

  /**
   * Subscribes to backend Server-Sent Events (SSE) for zero-latency live updates
   */
  subscribeToEvents(onEvent: (event: { type: string; payload: any; timestamp: string }) => void): () => void {
    if (typeof window === 'undefined' || !window.EventSource) {
      return () => {};
    }

    try {
      const eventSource = new EventSource(`${API_BASE}/events`);

      eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          onEvent(data);
        } catch {
          // Heartbeat comment or raw message fallback
        }
      };

      eventSource.onerror = () => {
        // EventSource automatically retries connection per spec
      };

      return () => {
        eventSource.close();
      };
    } catch {
      return () => {};
    }
  },

  /**
   * Dispatches a simulated customer WhatsApp voice note to the backend agent
   */
  async simulateVoiceNote(data: { from?: string; name?: string; transcript?: string }): Promise<any> {
    try {
      // Backend supports both /api/webhook/simulate-voice and /webhook/simulate-voice
      const res = await fetch(`${API_BASE}/webhook/simulate-voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch (err) {
      console.error('[API] Simulate voice note failed:', err);
      return { status: 'error', error: (err as Error).message };
    }
  },
};
