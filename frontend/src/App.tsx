import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, ArrowRight, Sparkles } from 'lucide-react';
import {
  MenuItem,
  EnterpriseOrder,
  EnterpriseHandoff,
  DashboardStats,
} from './types/index.ts';
import { api } from './services/api.ts';
import {
  Sidebar,
  AdminViewType,
  TopBar,
  StatsBar,
  OrderKanban,
  ConversationalDrawer,
  KitchenPrepSheet,
  EscalationsView,
  MenuCatalogView,
  LogisticsView,
} from './components/admin/index.ts';
import styles from './App.module.css';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AdminViewType>('pipeline');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<EnterpriseOrder[]>([]);
  const [handoffs, setHandoffs] = useState<EnterpriseHandoff[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    totalEvents: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingHandoffs: 0,
    totalHandoffs: 0,
  });

  const [selectedOrder, setSelectedOrder] = useState<EnterpriseOrder | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = useCallback(() => {
    api.getMenu().then((res) => {
      setMenuItems(res.items);
    });

    api.getOrders().then((res) => setOrders(res.orders));
    api.getHandoffs().then((res) => setHandoffs(res.handoffs));
    api.getStats().then((res) => setStats(res));
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 4500);
  }, []);

  useEffect(() => {
    loadData();

    // Subscribe to SSE real-time push stream
    const unsubscribe = api.subscribeToEvents((event) => {
      if (event.type === 'ORDER_CREATED') {
        loadData();
        showToast(`⚡ New Order: ${event.payload?.id || 'Incoming'} (£${event.payload?.totalAmount || '---'})`);
      } else if (event.type === 'ORDER_UPDATED') {
        loadData();
      } else if (event.type === 'HANDOFF_CREATED') {
        loadData();
        showToast(`🚨 New Escalation: ${event.payload?.reason || 'Human Assistance Needed'}`);
      } else if (event.type === 'HANDOFF_RESOLVED') {
        loadData();
      } else if (event.type === 'MESSAGE_LOGGED') {
        loadData();
        if (event.payload?.direction === 'INBOUND') {
          showToast(`💬 WhatsApp Message from ${event.payload?.phoneNumber}`);
        }
      }
    });

    // Fallback heartbeat polling
    const interval = setInterval(loadData, 20000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [loadData, showToast]);

  // Global hotkey: '/' focuses the search bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        if (searchInput) searchInput.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleAdvanceStatus = async (orderId: string, newStatus: string) => {
    // Optimistic UI update across all orders
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              paymentStatus: newStatus === 'CONFIRMED' ? 'PAID' : o.paymentStatus,
              confirmedAt: newStatus === 'CONFIRMED' ? new Date().toISOString() : o.confirmedAt,
              event: o.event ? { ...o.event, status: newStatus as any } : undefined,
            }
          : o
      )
    );
    // Optimistic UI update for currently opened drawer
    setSelectedOrder((prev) =>
      prev && prev.id === orderId
        ? {
            ...prev,
            paymentStatus: newStatus === 'CONFIRMED' ? 'PAID' : prev.paymentStatus,
            confirmedAt: newStatus === 'CONFIRMED' ? new Date().toISOString() : prev.confirmedAt,
            event: prev.event ? { ...prev.event, status: newStatus as any } : undefined,
          }
        : prev
    );
    await api.updateOrderStatus(orderId, newStatus);
    loadData();
  };

  const handleResolveHandoff = async (phone: string) => {
    await api.resolveHandoff(phone);
    loadData();
  };

  const pendingHandoffs = handoffs.filter((h) => h.status === 'PENDING');

  return (
    <div className={styles.appLayout}>
      {/* Royal Emerald Navigation Sidebar */}
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        pendingHandoffCount={pendingHandoffs.length}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className={styles.mainViewport}>
        {/* Executive Top Bar */}
        <TopBar
          currentView={currentView}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          onRefresh={loadData}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        />

        <div className={styles.contentContainer}>
          {/* Urgent Escalations Alert Banner (visible on any screen if pending) */}
          {pendingHandoffs.length > 0 && currentView !== 'escalations' && (
            <div className={styles.handoffAlertBanner}>
              <div className={styles.alertContent}>
                <ShieldAlert size={18} className={styles.alertIcon} />
                <span>
                  <strong>{pendingHandoffs.length} Concierge Escalation(s) Awaiting Review:</strong>{' '}
                  {pendingHandoffs[0].reason} ({pendingHandoffs[0].phoneNumber})
                </span>
              </div>
              <button
                className={styles.resolveBtn}
                onClick={() => setCurrentView('escalations')}
              >
                <span>Inspect Queue</span>
                <ArrowRight size={13} />
              </button>
            </div>
          )}

          {/* Dynamic Views */}
          {currentView === 'pipeline' && (
            <>
              <StatsBar stats={stats} orders={orders} />
              <OrderKanban
                orders={orders}
                filter={activeFilter}
                searchQuery={searchQuery}
                onSelectOrder={setSelectedOrder}
                onAdvanceStatus={handleAdvanceStatus}
              />
            </>
          )}

          {currentView === 'kitchen' && (
            <KitchenPrepSheet
              orders={orders}
              onSelectOrder={setSelectedOrder}
              onAdvanceStatus={handleAdvanceStatus}
            />
          )}

          {currentView === 'escalations' && (
            <EscalationsView
              handoffs={handoffs}
              onResolve={handleResolveHandoff}
            />
          )}

          {currentView === 'menu_catalog' && <MenuCatalogView items={menuItems} />}

          {currentView === 'logistics' && <LogisticsView orders={orders} />}
        </div>

        {/* Velvet Scrim Dual-Pane Conversational Drawer */}
        <ConversationalDrawer
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={handleAdvanceStatus}
        />

        {/* Operational Footer */}
        <footer className={styles.footerBar}>
          <div>
            Dil Se Royal Culinary Operations Hub • London, UK • End-to-End Encrypted Webhook Stream
          </div>
          <div className={styles.footerRight}>
            <Sparkles size={12} className={styles.goldStar} />
            <span>Michelin-Grade Execution & British Halal Certified</span>
          </div>
        </footer>

        {/* Real-time SSE Live Toast Notification */}
        {toastMessage && (
          <div className={styles.liveToast}>
            <div className={styles.liveToastPulse} />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};
