import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  Flame,
  Truck,
  CheckCircle2,
  MapPin,
  Clock,
  Users,
  MessageSquare,
  ArrowRight,
  Shield,
  Calendar,
  Copy,
  Check,
  Leaf,
  X,
  ChevronDown,
  ChevronUp,
  FileCheck,
  AlertTriangle,
} from 'lucide-react';
import { EnterpriseOrder } from '../../types/index.ts';
import styles from './OrderKanban.module.css';

interface OrderKanbanProps {
  orders: EnterpriseOrder[];
  filter: string;
  searchQuery: string;
  onSelectOrder: (order: EnterpriseOrder) => void;
  onAdvanceStatus: (orderId: string, currentStatus: string) => void;
}

interface ColumnDef {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  accentColor: string;
  accentBg: string;
}

const DISPATCH_STAGES: ColumnDef[] = [
  {
    id: 'CONFIRMED',
    title: 'Deposit Secured',
    subtitle: 'Locked into Schedule',
    icon: ShieldCheck,
    accentColor: '#059669',
    accentBg: '#d1fae5',
  },
  {
    id: 'IN_PREP',
    title: 'Kitchen Handi Stoves',
    subtitle: 'Dum & Tandoor Fired',
    icon: Flame,
    accentColor: '#ea580c',
    accentBg: '#ffedd5',
  },
  {
    id: 'DISPATCHED',
    title: 'Heated Fleet Dispatch',
    subtitle: 'En Route to Venue',
    icon: Truck,
    accentColor: '#2563eb',
    accentBg: '#dbeafe',
  },
  {
    id: 'COMPLETED',
    title: 'Banquet Executed',
    subtitle: 'Service Delivered',
    icon: CheckCircle2,
    accentColor: '#64748b',
    accentBg: '#f1f5f9',
  },
];

export const OrderKanban: React.FC<OrderKanbanProps> = ({
  orders,
  filter,
  searchQuery,
  onSelectOrder,
  onAdvanceStatus,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<string>('ALL');
  const [isIntakeExpanded, setIsIntakeExpanded] = useState<boolean>(true);
  const [selectedReviewOrder, setSelectedReviewOrder] = useState<EnterpriseOrder | null>(null);
  const [confirmationToast, setConfirmationToast] = useState<string | null>(null);

  // Review modal checklist verification state
  const [checklist, setChecklist] = useState<{
    capacity: boolean;
    dietary: boolean;
    deposit: boolean;
  }>({
    capacity: true,
    dietary: true,
    deposit: true,
  });

  const fallbackOrders: EnterpriseOrder[] = [
    {
      id: 'ORD-ROYAL-101',
      customerId: 'CUS-101',
      orderMode: 'FEAST_PACKAGE',
      selectedPackageId: 'PKG-GOLD',
      totalAmount: 1440.0,
      paymentStatus: 'PAID',
      itemsSummary: 'Dil Se Royal Celebration Feast (80 Covers)',
      createdAt: new Date().toISOString(),
      customer: {
        id: 'CUS-101',
        name: 'Priya & Vikram Sharma',
        phoneNumber: '+44 7123 456789',
        postcode: 'HA9 9AA (Wembley)',
      },
      event: {
        id: 'EVT-101',
        eventType: 'Royal Shaadi Reception',
        eventDate: '2026-10-11',
        servingTime: '13:30 BST',
        guestCount: 80,
        deliveryAddress: 'Wembley Grand Banqueting Hall, HA9',
        dietaryPreference: 'Mixed 60/40 (Halal Meat + Veg Cushion)',
        status: 'CONFIRMED',
      },
    },
    {
      id: 'ORD-TRAY-202',
      customerId: 'CUS-202',
      orderMode: 'A_LA_CARTE_TRAYS',
      totalAmount: 485.0,
      paymentStatus: 'PENDING',
      itemsSummary: '3x Awadhi Biryani Trays, 2x Butter Chicken, 2x Shahi Paneer',
      createdAt: new Date().toISOString(),
      customer: {
        id: 'CUS-202',
        name: 'Rajesh & Suman Patel',
        phoneNumber: '+44 7987 654321',
        postcode: 'SL1 2DX (Slough)',
      },
      event: {
        id: 'EVT-202',
        eventType: 'Home Puja & Gathering',
        eventDate: '2026-10-10',
        servingTime: '18:30 BST',
        guestCount: 40,
        deliveryAddress: 'Upton Court Road, Slough SL1',
        dietaryPreference: 'Strict Pure Vegetarian (Jain prep)',
        status: 'QUOTED',
      },
    },
    {
      id: 'ORD-ROYAL-303',
      customerId: 'CUS-303',
      orderMode: 'FEAST_PACKAGE',
      selectedPackageId: 'PKG-SILVER',
      totalAmount: 1160.0,
      paymentStatus: 'PAID',
      itemsSummary: 'Dil Se Classic Feast (60 Covers)',
      createdAt: new Date().toISOString(),
      customer: {
        id: 'CUS-303',
        name: 'Ayesha & Tariq Khan',
        phoneNumber: '+44 7555 123456',
        postcode: 'UB1 3HE (Southall)',
      },
      event: {
        id: 'EVT-303',
        eventType: 'Walima Banquet Gathering',
        eventDate: '2026-10-11',
        servingTime: '19:00 BST',
        guestCount: 60,
        deliveryAddress: 'The Broadway Banquet Suite, UB1',
        dietaryPreference: '100% British Halal Certified',
        status: 'IN_PREP',
      },
    },
    {
      id: 'ORD-ROYAL-404',
      customerId: 'CUS-404',
      orderMode: 'FEAST_PACKAGE',
      selectedPackageId: 'PKG-GOLD',
      totalAmount: 2880.0,
      paymentStatus: 'PAID',
      itemsSummary: 'Dil Se Royal Celebration Feast (160 Covers)',
      createdAt: new Date().toISOString(),
      customer: {
        id: 'CUS-404',
        name: 'Arjun & Meera Singhania',
        phoneNumber: '+44 7888 999000',
        postcode: 'TW7 4NP (Isleworth)',
      },
      event: {
        id: 'EVT-404',
        eventType: 'Corporate Diwali Gala',
        eventDate: '2026-10-10',
        servingTime: '19:30 BST',
        guestCount: 160,
        deliveryAddress: 'Osterley Park Pavilion, TW7',
        dietaryPreference: 'Mixed 60/40 (Halal Meat + Veg Cushion)',
        status: 'DISPATCHED',
      },
    },
    {
      id: 'ORD-ROYAL-505',
      customerId: 'CUS-505',
      orderMode: 'FEAST_PACKAGE',
      selectedPackageId: 'PKG-GOLD',
      totalAmount: 3600.0,
      paymentStatus: 'PAID',
      itemsSummary: 'Dil Se Grand Banquet (200 Covers)',
      createdAt: new Date().toISOString(),
      customer: {
        id: 'CUS-505',
        name: 'Lord & Lady Mountjoy / Gupta Corp',
        phoneNumber: '+44 7444 332211',
        postcode: 'W1K 7TN (Mayfair)',
      },
      event: {
        id: 'EVT-505',
        eventType: 'Mayfair Charity Gala Feast',
        eventDate: '2026-10-09',
        servingTime: '20:00 BST',
        guestCount: 200,
        deliveryAddress: 'The Grosvenor House Ballroom, W1K',
        dietaryPreference: 'Gourmet Mughlai • Nut-Free Audited',
        status: 'COMPLETED',
      },
    },
  ];

  const sourceOrders = orders && orders.length > 0 ? orders : fallbackOrders;

  const filteredOrders = sourceOrders.filter((o) => {
    const custName = o.customer?.name?.toLowerCase() || '';
    const phone = o.customer?.phoneNumber || '';
    const postcode = o.customer?.postcode?.toLowerCase() || '';
    const venue = o.event?.deliveryAddress?.toLowerCase() || '';
    const q = searchQuery.toLowerCase();

    const matchesSearch =
      custName.includes(q) || phone.includes(q) || postcode.includes(q) || venue.includes(q);

    if (!matchesSearch) return false;

    if (filter === 'This Weekend') {
      return o.event?.eventDate?.includes('2026-10-10') || o.event?.eventDate?.includes('2026-10-11');
    }
    if (filter === 'Mixed 60/40') {
      return (
        o.event?.dietaryPreference?.toLowerCase().includes('mixed') ||
        o.event?.dietaryPreference?.toLowerCase().includes('60/40')
      );
    }
    if (filter === 'Urgent') {
      return o.event?.status === 'IN_PREP' || o.paymentStatus === 'PENDING';
    }

    return true;
  });

  // 1. INBOUND REVIEW QUEUE: Orders with QUOTED status awaiting manager review & manual confirmation
  const pendingReviewOrders = filteredOrders.filter(
    (o) => (o.event?.status || 'QUOTED') === 'QUOTED'
  );

  // 2. LIVE DISPATCH SCHEDULE: Strictly confirmed & active orders
  const scheduledOrders = filteredOrders
    .filter((o) => (o.event?.status || 'QUOTED') !== 'QUOTED')
    .filter((o) => stageFilter === 'ALL' || (o.event?.status || '') === stageFilter)
    .sort((a, b) => (a.event?.servingTime || '').localeCompare(b.event?.servingTime || ''));

  const getNextStageLabel = (currentStatus: string): string => {
    switch (currentStatus) {
      case 'CONFIRMED':
        return 'Send to Kitchen';
      case 'IN_PREP':
        return 'Dispatch Van';
      case 'DISPATCHED':
        return 'Mark Delivered';
      default:
        return 'Archive';
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'DS';
    const clean = name.replace(/&/g, ' ').replace(/\s+/g, ' ').trim();
    const parts = clean.split(' ').filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return clean.slice(0, 2).toUpperCase();
  };

  const handleCopyCode = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedId(code);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleOpenReviewModal = (order: EnterpriseOrder, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedReviewOrder(order);
    setChecklist({ capacity: true, dietary: true, deposit: true });
  };

  const handleConfirmAndSchedule = (orderId: string, slipCode: string) => {
    onAdvanceStatus(orderId, 'CONFIRMED');
    setSelectedReviewOrder(null);
    setConfirmationToast(`Order ${slipCode} confirmed! Deposit secured & published to Live Dispatch Schedule.`);
    setTimeout(() => setConfirmationToast(null), 4500);
  };

  const renderDietaryPill = (dietary?: string) => {
    const text = dietary || '100% British Halal Certified';
    const isVeg = text.toLowerCase().includes('vegetarian') || text.toLowerCase().includes('jain');
    const isHalal = text.toLowerCase().includes('halal');

    if (isVeg) {
      return (
        <span className={styles.dietaryPillVeg}>
          <Leaf size={11} className={styles.dietaryIcon} />
          <span>{text}</span>
        </span>
      );
    }
    if (isHalal) {
      return (
        <span className={styles.dietaryPillHalal}>
          <Shield size={11} className={styles.dietaryIcon} />
          <span>{text}</span>
        </span>
      );
    }
    return (
      <span className={styles.dietaryPillMixed}>
        <span className={styles.dietaryDot} />
        <span>{text}</span>
      </span>
    );
  };

  return (
    <div className={styles.boardWrapper}>
      {/* Dynamic Operational Confirmation Toast */}
      {confirmationToast && (
        <div className={styles.confirmationToast}>
          <CheckCircle2 size={16} className={styles.toastSuccessIcon} />
          <span>{confirmationToast}</span>
        </div>
      )}

      {/* =========================================================================
          SECTION 1: INBOUND CONCIERGE INTAKE & REVIEW DESK
          (Quotes require manual manager verification before entering dispatch)
          ========================================================================= */}
      <div className={styles.intakeDeskContainer}>
        <div className={styles.intakeDeskHeader}>
          <div className={styles.intakeHeaderLeft}>
            <div className={styles.intakeBadge}>
              <span className={styles.intakeBeaconDot} />
              <Sparkles size={13} className={styles.intakeSparkle} />
              <span className={styles.intakeTitle}>Inbound Concierge Intake & Review Desk</span>
            </div>

            <span
              className={`${styles.intakeCounterBadge} ${
                pendingReviewOrders.length > 0 ? styles.counterPending : styles.counterClear
              }`}
            >
              {pendingReviewOrders.length > 0
                ? `${pendingReviewOrders.length} Order Awaiting Confirmation`
                : 'All Orders Confirmed'}
            </span>
          </div>

          <div className={styles.intakeHeaderRight}>
            <button
              className={styles.intakeToggleBtn}
              onClick={() => setIsIntakeExpanded((prev) => !prev)}
            >
              <span>{isIntakeExpanded ? 'Collapse Intake Desk' : 'Expand Intake Desk'}</span>
              {isIntakeExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>
        </div>

        {isIntakeExpanded && (
          <div className={styles.intakeBody}>
            {pendingReviewOrders.length > 0 ? (
              <div className={styles.intakeCardsGrid}>
                {pendingReviewOrders.map((order) => {
                  const slipCode = `#${order.id.replace('ORD-', '')}`;
                  const isFeast = order.orderMode === 'FEAST_PACKAGE';
                  const depositAmount = (order.totalAmount * 0.5).toFixed(2);

                  return (
                    <div
                      key={order.id}
                      className={styles.intakeCard}
                      onClick={() => handleOpenReviewModal(order)}
                    >
                      {/* Intake Card Header */}
                      <div className={styles.intakeCardTop}>
                        <div className={styles.intakeSlipGroup}>
                          <button
                            className={styles.codePill}
                            onClick={(e) => handleCopyCode(slipCode, e)}
                            title="Copy slip code"
                          >
                            <span>{slipCode}</span>
                            {copiedId === slipCode ? (
                              <Check size={10} className={styles.copiedIcon} />
                            ) : (
                              <Copy size={9} className={styles.copyIcon} />
                            )}
                          </button>
                          <span
                            className={`${styles.tierBadge} ${
                              isFeast ? styles.tierFeast : styles.tierTray
                            }`}
                          >
                            {isFeast ? 'Royal Feast' : 'Party Trays'}
                          </span>
                        </div>

                        <div className={styles.awaitingBadge}>
                          <AlertTriangle size={11} />
                          <span>Awaiting Manager Review</span>
                        </div>
                      </div>

                      {/* Host & Venue Snapshot */}
                      <div className={styles.intakeHostBlock}>
                        <div className={styles.hostAvatar}>
                          {getInitials(order.customer?.name)}
                        </div>
                        <div className={styles.intakeHostDetails}>
                          <h4 className={styles.intakeHostName}>{order.customer?.name}</h4>
                          <span className={styles.intakeHostSub}>
                            {order.customer?.phoneNumber} • {order.customer?.postcode || 'Greater London'}
                          </span>
                        </div>
                      </div>

                      {/* Event Snapshot */}
                      <div className={styles.intakeEventMeta}>
                        <div className={styles.intakeEventItem}>
                          <Calendar size={12} className={styles.intakeMetaIcon} />
                          <span>{order.event?.eventType} • {order.event?.eventDate}</span>
                        </div>
                        <div className={styles.intakeEventItem}>
                          <Clock size={12} className={styles.intakeMetaIcon} />
                          <span>Serving Time: <strong>{order.event?.servingTime || '18:30 BST'}</strong></span>
                        </div>
                        <div className={styles.intakeEventItem}>
                          <MapPin size={12} className={styles.intakeMetaIcon} />
                          <span>{order.event?.deliveryAddress}</span>
                        </div>
                        <div className={styles.intakeEventItem}>
                          <Users size={12} className={styles.intakeMetaIcon} />
                          <span><strong>{order.event?.guestCount} Guests</strong></span>
                        </div>
                      </div>

                      {/* Dietary Requirement Pill */}
                      <div className={styles.dietaryRow}>
                        {renderDietaryPill(order.event?.dietaryPreference)}
                      </div>

                      {/* Culinary Manifest */}
                      <div className={styles.scheduleMenuBlock}>
                        <span className={styles.manifestLabel}>Manifest:</span>
                        <span className={styles.scheduleMenu}>{order.itemsSummary}</span>
                      </div>

                      {/* Financial Bar */}
                      <div className={styles.intakeFinancialBar}>
                        <div className={styles.intakeAmountGroup}>
                          <span className={styles.intakeTotalLabel}>Quote Total:</span>
                          <span className={styles.intakeTotalAmount}>£{order.totalAmount.toFixed(2)}</span>
                          <span className={styles.intakeDepositNote}>
                            (50% Deposit Req: £{depositAmount})
                          </span>
                        </div>
                        <span className={styles.pillPending}>● Deposit Awaiting</span>
                      </div>

                      {/* Manager Action Bar */}
                      <div className={styles.intakeActionRow}>
                        <button
                          className={styles.intakeChatBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectOrder(order);
                          }}
                          title="Open WhatsApp chat transcript"
                        >
                          <MessageSquare size={13} />
                          <span>WhatsApp Host</span>
                        </button>

                        <button
                          className={styles.intakeReviewBtn}
                          onClick={(e) => handleOpenReviewModal(order, e)}
                        >
                          <FileCheck size={13} />
                          <span>Review & Confirm Order ➔</span>
                        </button>

                        <button
                          className={styles.intakeInstantConfirmBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConfirmAndSchedule(order.id, slipCode);
                          }}
                          title="Directly confirm and lock into schedule"
                        >
                          <ShieldCheck size={13} />
                          <span>Instant Confirm</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={styles.intakeClearBanner}>
                <div className={styles.intakeClearLeft}>
                  <CheckCircle2 size={16} className={styles.clearIcon} />
                  <span>
                    <strong>Inbound Review Desk Clear</strong> — All customer quotes & inquiries have been reviewed and locked into the Live Dispatch Schedule.
                  </span>
                </div>
                <span className={styles.intakeClearSub}>0 Inquiries Pending</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* =========================================================================
          SECTION 2: LIVE DISPATCH SCHEDULE TIMELINE (CONFIRMED EXPEDITIONS ONLY)
          ========================================================================= */}
      <div className={styles.boardToolbar}>
        <div className={styles.toolbarLeft}>
          <div className={styles.scheduleBadge}>
            <Calendar size={14} className={styles.calendarIcon} />
            <span className={styles.scheduleTitle}>Live Dispatch Schedule</span>
          </div>

          <div className={styles.telemetryTag}>
            <span className={styles.livePulseDot} />
            <span>
              {scheduledOrders.length} Confirmed Expeditions • Chronological Dispatch
            </span>
          </div>
        </div>

        {/* Dispatch Stage Filters */}
        <div className={styles.stageFilterScroll}>
          <button
            className={`${styles.stageFilterBtn} ${stageFilter === 'ALL' ? styles.stageFilterActive : ''}`}
            onClick={() => setStageFilter('ALL')}
          >
            All Service Hours ({filteredOrders.filter((o) => (o.event?.status || 'QUOTED') !== 'QUOTED').length})
          </button>
          {DISPATCH_STAGES.map((col) => {
            const count = filteredOrders.filter((o) => (o.event?.status || '') === col.id).length;
            return (
              <button
                key={col.id}
                className={`${styles.stageFilterBtn} ${stageFilter === col.id ? styles.stageFilterActive : ''}`}
                onClick={() => setStageFilter(col.id)}
              >
                <span className={styles.filterDot} style={{ background: col.accentColor }} />
                <span>{col.title} ({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Full-Width Chronological Timeline */}
      <div className={styles.scheduleContainer}>
        {scheduledOrders.length > 0 ? (
          <div className={styles.timelineList}>
            {scheduledOrders.map((order) => {
              const currentStatus = order.event?.status || 'CONFIRMED';
              const slipCode = `#${order.id.replace('ORD-', '')}`;
              const isFeast = order.orderMode === 'FEAST_PACKAGE';
              const colInfo = DISPATCH_STAGES.find((c) => c.id === currentStatus) || DISPATCH_STAGES[0];

              return (
                <div
                  key={order.id}
                  className={styles.scheduleItem}
                  onClick={() => onSelectOrder(order)}
                >
                  {/* Time & Service Date Column */}
                  <div className={styles.timeMarker}>
                    <span className={styles.timeHour}>{order.event?.servingTime || '18:00 BST'}</span>
                    <span className={styles.timeDate}>{order.event?.eventDate}</span>
                    <span className={styles.timeCountdownBadge}>
                      <Clock size={10} />
                      <span>T-Service</span>
                    </span>
                  </div>

                  {/* Vertical Spine Node */}
                  <div className={styles.scheduleNode}>
                    <span
                      className={styles.scheduleDot}
                      style={{ background: colInfo.accentColor }}
                    />
                    <div className={styles.scheduleLine} />
                  </div>

                  {/* High-Density Luxury Dispatch Card */}
                  <div className={styles.scheduleCard}>
                    {/* Row 1: Code + Tier + Status Badge */}
                    <div className={styles.scheduleHeader}>
                      <div className={styles.scheduleMeta}>
                        <button
                          className={styles.codePill}
                          onClick={(e) => handleCopyCode(slipCode, e)}
                          title="Copy slip code"
                        >
                          <span>{slipCode}</span>
                          {copiedId === slipCode ? (
                            <Check size={10} className={styles.copiedIcon} />
                          ) : (
                            <Copy size={9} className={styles.copyIcon} />
                          )}
                        </button>

                        <span
                          className={`${styles.tierBadge} ${
                            isFeast ? styles.tierFeast : styles.tierTray
                          }`}
                        >
                          {isFeast ? 'Royal Feast' : 'Party Trays'}
                        </span>
                      </div>

                      <span
                        className={styles.matrixStageBadge}
                        style={{
                          color: colInfo.accentColor,
                          background: colInfo.accentBg,
                          borderColor: colInfo.accentColor + '40',
                        }}
                      >
                        <span className={styles.filterDot} style={{ background: colInfo.accentColor }} />
                        {colInfo.title}
                      </span>
                    </div>

                    {/* Row 2: Host & Venue Grid */}
                    <div className={styles.scheduleHostGrid}>
                      <div className={styles.hostIdentity}>
                        <div className={styles.hostAvatar}>
                          {getInitials(order.customer?.name)}
                        </div>
                        <div>
                          <h4 className={styles.scheduleHost}>{order.customer?.name}</h4>
                          <span className={styles.schedulePhone}>{order.customer?.phoneNumber}</span>
                        </div>
                      </div>

                      <div className={styles.scheduleVenueBox}>
                        <div className={styles.venueRow}>
                          <MapPin size={12} className={styles.venueIcon} />
                          <span className={styles.venueText}>{order.event?.deliveryAddress}</span>
                        </div>
                        <div className={styles.coversBadge}>
                          <Users size={11} />
                          <span>{order.event?.guestCount} Covers</span>
                        </div>
                      </div>
                    </div>

                    {/* Row 3: Dietary Integrity Pill */}
                    <div className={styles.dietaryRow}>
                      {renderDietaryPill(order.event?.dietaryPreference)}
                    </div>

                    {/* Row 4: Culinary Manifest */}
                    <div className={styles.scheduleMenuBlock}>
                      <span className={styles.manifestLabel}>Kitchen Manifest:</span>
                      <span className={styles.scheduleMenu}>{order.itemsSummary}</span>
                    </div>

                    {/* Row 5: Financial Ledger & Actions */}
                    <div className={styles.scheduleFooter}>
                      <div className={styles.ledgerBlock}>
                        <span className={styles.scheduleAmount}>
                          £{order.totalAmount.toFixed(2)}
                        </span>
                        <span
                          className={`${styles.paymentStatusPill} ${
                            order.paymentStatus === 'PAID'
                              ? styles.pillSecured
                              : styles.pillPending
                          }`}
                        >
                          {order.paymentStatus === 'PAID' ? '● Deposit Secured' : '● Deposit Awaiting'}
                        </span>
                      </div>

                      <div className={styles.cardActions}>
                        <button
                          className={styles.actionChatBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectOrder(order);
                          }}
                          title="Open WhatsApp Thread"
                        >
                          <MessageSquare size={13} />
                          <span>WhatsApp Host</span>
                        </button>

                        {currentStatus !== 'COMPLETED' && (
                          <button
                            className={styles.actionAdvanceBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              onAdvanceStatus(order.id, currentStatus);
                            }}
                            title={getNextStageLabel(currentStatus)}
                          >
                            <span>{getNextStageLabel(currentStatus)}</span>
                            <ArrowRight size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyScheduleState}>
            <Calendar size={32} className={styles.emptyIcon} />
            <h3 className={styles.emptyTitle}>No Expeditions in this Stage</h3>
            <p className={styles.emptyText}>
              Inbound quotes must be reviewed and confirmed manually at the Intake Desk before they appear here.
            </p>
          </div>
        )}
      </div>

      {/* =========================================================================
          SECTION 3: MANUAL ORDER REVIEW & CONFIRMATION MODAL
          ========================================================================= */}
      {selectedReviewOrder && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setSelectedReviewOrder(null)}
        >
          <div
            className={styles.reviewModal}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderLeft}>
                <div className={styles.modalTitleRow}>
                  <ShieldCheck size={18} className={styles.modalHeaderIcon} />
                  <h3 className={styles.modalTitle}>Manual Order Review & Confirmation</h3>
                  <span className={styles.modalCodeBadge}>
                    #{selectedReviewOrder.id.replace('ORD-', '')}
                  </span>
                </div>
                <p className={styles.modalSubtitle}>
                  Verify culinary logistics, dietary protocols, and deposit receipt before publishing to the Live Dispatch Schedule.
                </p>
              </div>
              <button
                className={styles.modalCloseBtn}
                onClick={() => setSelectedReviewOrder(null)}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div className={styles.modalBody}>
              {/* Grid: Host Dossier & Event Parameters */}
              <div className={styles.modalDossierGrid}>
                <div className={styles.dossierCol}>
                  <span className={styles.dossierLabel}>Host & Customer</span>
                  <div className={styles.dossierValueMain}>
                    {selectedReviewOrder.customer?.name}
                  </div>
                  <div className={styles.dossierValueSub}>
                    {selectedReviewOrder.customer?.phoneNumber} • {selectedReviewOrder.customer?.postcode}
                  </div>
                </div>

                <div className={styles.dossierCol}>
                  <span className={styles.dossierLabel}>Event & Date</span>
                  <div className={styles.dossierValueMain}>
                    {selectedReviewOrder.event?.eventType}
                  </div>
                  <div className={styles.dossierValueSub}>
                    {selectedReviewOrder.event?.eventDate} @ {selectedReviewOrder.event?.servingTime || '18:30 BST'}
                  </div>
                </div>

                <div className={styles.dossierCol}>
                  <span className={styles.dossierLabel}>Venue Address</span>
                  <div className={styles.dossierValueMain}>
                    {selectedReviewOrder.event?.deliveryAddress}
                  </div>
                  <div className={styles.dossierValueSub}>
                    {selectedReviewOrder.event?.guestCount} Covers • {selectedReviewOrder.orderMode === 'FEAST_PACKAGE' ? 'Royal Feast' : 'Party Trays'}
                  </div>
                </div>
              </div>

              {/* Dietary Integrity Audit Section */}
              <div className={styles.modalSectionBox}>
                <div className={styles.modalSectionHeader}>
                  <Leaf size={14} className={styles.leafIcon} />
                  <span className={styles.modalSectionTitle}>Dietary Integrity Audit</span>
                </div>
                <div className={styles.dietaryAuditContent}>
                  <div className={styles.dietaryPillWrap}>
                    {renderDietaryPill(selectedReviewOrder.event?.dietaryPreference)}
                  </div>
                  <p className={styles.dietaryAuditText}>
                    Segregation protocol active. Kitchen will ensure dedicated utensils, separate tandoor/pan allocation, and strict cross-contact safeguards.
                  </p>
                </div>
              </div>

              {/* Culinary Manifest */}
              <div className={styles.modalSectionBox}>
                <div className={styles.modalSectionHeader}>
                  <Flame size={14} className={styles.flameIcon} />
                  <span className={styles.modalSectionTitle}>Kitchen Manifest & Portions</span>
                </div>
                <div className={styles.modalManifestText}>
                  {selectedReviewOrder.itemsSummary}
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className={styles.modalFinancialBox}>
                <div className={styles.financialCol}>
                  <span className={styles.finLabel}>Total Order Value</span>
                  <strong className={styles.finValue}>£{selectedReviewOrder.totalAmount.toFixed(2)}</strong>
                </div>
                <div className={styles.financialCol}>
                  <span className={styles.finLabel}>50% Deposit Required</span>
                  <strong className={styles.finValueDeposit}>
                    £{(selectedReviewOrder.totalAmount * 0.5).toFixed(2)}
                  </strong>
                </div>
                <div className={styles.financialCol}>
                  <span className={styles.finLabel}>Balance Due at Delivery</span>
                  <strong className={styles.finValue}>
                    £{(selectedReviewOrder.totalAmount * 0.5).toFixed(2)}
                  </strong>
                </div>
              </div>

              {/* Manager Pre-Dispatch Checklist */}
              <div className={styles.checklistSection}>
                <span className={styles.checklistTitle}>
                  Manager Verification Checklist (All Required to Schedule):
                </span>

                <label className={styles.checkItem}>
                  <input
                    type="checkbox"
                    checked={checklist.capacity}
                    onChange={(e) =>
                      setChecklist((prev) => ({ ...prev, capacity: e.target.checked }))
                    }
                  />
                  <span>Kitchen handi stove & tandoor capacity verified for requested time slot</span>
                </label>

                <label className={styles.checkItem}>
                  <input
                    type="checkbox"
                    checked={checklist.dietary}
                    onChange={(e) =>
                      setChecklist((prev) => ({ ...prev, dietary: e.target.checked }))
                    }
                  />
                  <span>Dietary segregation protocol verified (Pure-Veg / Halal dedicated cookware assigned)</span>
                </label>

                <label className={styles.checkItem}>
                  <input
                    type="checkbox"
                    checked={checklist.deposit}
                    onChange={(e) =>
                      setChecklist((prev) => ({ ...prev, deposit: e.target.checked }))
                    }
                  />
                  <span>Deposit payment verified / pre-authorized card on file</span>
                </label>
              </div>
            </div>

            {/* Modal Actions */}
            <div className={styles.modalFooter}>
              <button
                className={styles.modalChatBtn}
                onClick={() => {
                  const ord = selectedReviewOrder;
                  setSelectedReviewOrder(null);
                  onSelectOrder(ord);
                }}
              >
                <MessageSquare size={13} />
                <span>Chat with Host on WhatsApp</span>
              </button>

              <div className={styles.modalFooterRight}>
                <button
                  className={styles.modalCancelBtn}
                  onClick={() => setSelectedReviewOrder(null)}
                >
                  Keep in Pending
                </button>

                <button
                  className={styles.modalConfirmBtn}
                  disabled={!checklist.capacity || !checklist.dietary || !checklist.deposit}
                  onClick={() => {
                    const slipCode = `#${selectedReviewOrder.id.replace('ORD-', '')}`;
                    handleConfirmAndSchedule(selectedReviewOrder.id, slipCode);
                  }}
                >
                  <ShieldCheck size={14} />
                  <span>Confirm Order & Push to Live Schedule ➔</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
