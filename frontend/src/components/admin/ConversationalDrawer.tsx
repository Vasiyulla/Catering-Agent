import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  CheckCheck,
  Send,
  Phone,
  ShieldCheck,
  MapPin,
  Calendar,
  Clock,
  Users,
  Printer,
  Sparkles,
  UserCog,
  Bot,
} from 'lucide-react';
import { EnterpriseOrder, EnterpriseMessage } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import styles from './ConversationalDrawer.module.css';

interface ConversationalDrawerProps {
  order: EnterpriseOrder | null;
  onClose: () => void;
  onStatusChange: (orderId: string, status: string) => void;
}

export const ConversationalDrawer: React.FC<ConversationalDrawerProps> = ({
  order,
  onClose,
  onStatusChange,
}) => {
  const [messages, setMessages] = useState<EnterpriseMessage[]>([]);
  const [isStaffTakeover, setIsStaffTakeover] = useState<boolean>(false);
  const [composerText, setComposerText] = useState<string>('');
  const [mobileTab, setMobileTab] = useState<'chat' | 'dossier'>('chat');

  useEffect(() => {
    if (!order) return;
    const customer = order.customer;
    if (!customer?.phoneNumber) return;
    const guestCount = order.event?.guestCount || 40;

    let isCurrent = true;
    api.getMessages(customer.phoneNumber).then((res) => {
      if (isCurrent && res.messages.length > 0) {
        setMessages(res.messages);
      } else if (isCurrent) {
        setMessages([
          {
            id: 'm1',
            phoneNumber: customer.phoneNumber,
            direction: 'INBOUND',
            messageText: `Namaste! We are arranging catering for ${guestCount} guests in ${customer.postcode || 'London'}. Could you share your royal banquet packages?`,
            createdAt: '14:20',
          },
          {
            id: 'm2',
            phoneNumber: customer.phoneNumber,
            direction: 'OUTBOUND',
            messageText: `Namaste ${customer.name || 'Valued Host'}! Delighted to connect with you. For a banquet of ${guestCount} guests, our Dil Se Classic Feast (£14.50/pp) is our signature spread. Includes starters, butter chicken, kadhai paneer, dal makhani, dum biryani, fresh naan and warm gulab jamun with luxury chafing warmers included.`,
            createdAt: '14:21',
          },
          {
            id: 'm3',
            phoneNumber: customer.phoneNumber,
            direction: 'INBOUND',
            messageText: `That sounds splendid! We have a mixed gathering of vegetarians and meat lovers. Can you guarantee the paneer and veg dishes won't run short?`,
            createdAt: '14:22',
          },
          {
            id: 'm4',
            phoneNumber: customer.phoneNumber,
            direction: 'OUTBOUND',
            messageText: `A golden rule from our banquet experience: non-vegetarian guests invariably love the Shahi Paneer as well! We intentionally build in a generous 40% vegetarian buffer so your vegetarian family members enjoy abundant feast platters throughout the evening.`,
            createdAt: '14:23',
          },
        ]);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [order]);

  if (!order) return null;

  const currentStatus = order.event?.status || 'QUOTED';

  const handleSendReply = () => {
    if (!composerText.trim() || !order.customer?.phoneNumber) return;

    const newMsg: EnterpriseMessage = {
      id: `m-${Date.now()}`,
      phoneNumber: order.customer.phoneNumber,
      direction: 'OUTBOUND',
      messageText: composerText,
      createdAt: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setComposerText('');
  };

  const handleQuickInsert = (text: string) => {
    setComposerText(text);
  };

  return (
    <div className={styles.drawerBackdrop} onClick={onClose}>
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        {/* Sleek Enterprise Header */}
        <div className={styles.drawerHeader}>
          <div className={styles.headerLeft}>
            <div className={styles.customerMeta}>
              <div className={styles.nameRow}>
                <h3 className={styles.custTitle}>{order.customer?.name}</h3>
                <span className={styles.verifiedChip}>
                  <CheckCircle2 size={12} />
                  <span>WhatsApp Verified</span>
                </span>
              </div>
              <span className={styles.custPhone}>
                {order.customer?.phoneNumber} • {order.customer?.postcode || 'London'}
              </span>
            </div>

            <button
              className={`${styles.takeoverToggle} ${
                isStaffTakeover ? styles.takeoverManual : styles.takeoverAI
              }`}
              onClick={() => setIsStaffTakeover(!isStaffTakeover)}
            >
              {isStaffTakeover ? (
                <>
                  <UserCog size={13} />
                  <span>Staff Takeover (AI Paused)</span>
                </>
              ) : (
                <>
                  <Bot size={13} />
                  <span>Kabir AI Active (Autopilot)</span>
                </>
              )}
            </button>
          </div>

          <button className={styles.closeBtn} onClick={onClose} aria-label="Close drawer">
            <X size={18} />
          </button>
        </div>

        {/* Mobile Tab Switcher */}
        <div className={styles.mobileTabBar}>
          <button
            className={`${styles.mobileTabBtn} ${
              mobileTab === 'chat' ? styles.mobileTabBtnActive : ''
            }`}
            onClick={() => setMobileTab('chat')}
          >
            WhatsApp Live Chat
          </button>
          <button
            className={`${styles.mobileTabBtn} ${
              mobileTab === 'dossier' ? styles.mobileTabBtnActive : ''
            }`}
            onClick={() => setMobileTab('dossier')}
          >
            Banquet Slip & Dossier
          </button>
        </div>

        {/* Studio Dual Body */}
        <div className={styles.studioBody}>
          {/* Left Column: WhatsApp Live Operations */}
          <div
            className={`${styles.chatColumn} ${
              mobileTab === 'chat' ? styles.columnVisible : styles.columnHiddenMobile
            }`}
          >
            <div className={styles.chatTelemetryNotice}>
              <Sparkles size={12} className={styles.telemetryIcon} />
              <span>Live Webhook • 12ms latency • Host Protection Active</span>
            </div>

            <div className={styles.messagesList}>
              {messages.map((m) => {
                const isInbound = m.direction === 'INBOUND';
                return (
                  <div
                    key={m.id}
                    className={`${styles.msgRow} ${
                      isInbound ? styles.msgInbound : styles.msgOutbound
                    }`}
                  >
                    <div className={styles.msgBubble}>
                      <div className={styles.msgText}>{m.messageText}</div>
                      <div className={styles.msgMeta}>
                        <span className={styles.msgTime}>{m.createdAt}</span>
                        {!isInbound && (
                          <CheckCheck size={13} className={styles.readTicks} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Action Triggers */}
            <div className={styles.quickTriggers}>
              <button
                className={styles.triggerChip}
                onClick={() =>
                  handleQuickInsert(
                    'Namaste! We have generated your official Dil Se banquet invoice. You can secure the booking with a £500 deposit here: https://pay.dilse.co.uk/invoice-101'
                  )
                }
              >
                Insert Deposit Link (£500)
              </button>
              <button
                className={styles.triggerChip}
                onClick={() =>
                  handleQuickInsert(
                    'All dishes are 100% British Halal Certified (HMC audited) and prepared in dedicated spice vessels.'
                  )
                }
              >
                Insert Halal Seal
              </button>
              <button
                className={styles.triggerChip}
                onClick={() =>
                  handleQuickInsert(
                    'Could you confirm if the venue ballroom provides a service lift for our heated chafing carts?'
                  )
                }
              >
                Confirm Venue Access
              </button>
            </div>

            {/* Live Message Composer */}
            <div className={styles.composerBar}>
              <input
                type="text"
                placeholder={
                  isStaffTakeover
                    ? 'Type reply as Duty Manager on WhatsApp...'
                    : 'AI active. Type here to reply manually...'
                }
                value={composerText}
                onChange={(e) => setComposerText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendReply();
                }}
                className={styles.composerInput}
              />
              <button
                className={styles.composerSendBtn}
                onClick={handleSendReply}
                disabled={!composerText.trim()}
              >
                <Send size={14} />
              </button>
            </div>
          </div>

          {/* Right Column: Culinary Banquet Dossier & Slip */}
          <div
            className={`${styles.dossierColumn} ${
              mobileTab === 'dossier' ? styles.columnVisible : styles.columnHiddenMobile
            }`}
          >
            <div className={styles.dossierHeader}>
              <span className={styles.dossierBadge}>CULINARY EVENT DOSSIER</span>
              <span className={styles.slipIdBadge}>
                #{order.id.replace('ORD-', '')}
              </span>
            </div>

            {/* Logistics Summary */}
            <div className={styles.dossierCard}>
              <div className={styles.dossierRow}>
                <Calendar size={13} className={styles.dossierIcon} />
                <div className={styles.dossierContent}>
                  <span className={styles.dossierLabel}>EVENT DATE</span>
                  <span className={styles.dossierVal}>
                    {order.event?.eventDate || '2026-10-11'} ({order.event?.eventType})
                  </span>
                </div>
              </div>

              <div className={styles.dossierRow}>
                <Clock size={13} className={styles.dossierIcon} />
                <div className={styles.dossierContent}>
                  <span className={styles.dossierLabel}>SERVING TIME</span>
                  <span className={styles.dossierVal}>
                    {order.event?.servingTime || '18:30 BST'} • Hot Chafing Buffet
                  </span>
                </div>
              </div>

              <div className={styles.dossierRow}>
                <MapPin size={13} className={styles.dossierIcon} />
                <div className={styles.dossierContent}>
                  <span className={styles.dossierLabel}>BANQUET VENUE</span>
                  <span className={styles.dossierVal}>
                    {order.event?.deliveryAddress || 'London Delivery'}
                  </span>
                </div>
              </div>

              <div className={styles.dossierRow}>
                <Users size={13} className={styles.dossierIcon} />
                <div className={styles.dossierContent}>
                  <span className={styles.dossierLabel}>GUEST COVERS</span>
                  <span className={styles.dossierVal}>
                    {order.event?.guestCount || 40} Covers ({order.event?.dietaryPreference})
                  </span>
                </div>
              </div>
            </div>

            {/* Culinary Dishes Selection */}
            <div className={styles.dossierCard}>
              <div className={styles.cardSectionTitle}>SELECTED MENU & DISHES</div>
              <p className={styles.itemsSummaryText}>{order.itemsSummary}</p>
              <div className={styles.halalNotice}>
                <ShieldCheck size={13} className={styles.halalIcon} />
                <span>100% British Halal Certified & Dedicated Veg Stoves</span>
              </div>
            </div>

            {/* Financial Ledger */}
            <div className={styles.dossierCard}>
              <div className={styles.cardSectionTitle}>FINANCIAL LEDGER</div>
              <div className={styles.financialRow}>
                <span>Gross Banquet Quote</span>
                <strong>£{order.totalAmount.toFixed(2)}</strong>
              </div>
              <div className={styles.financialRow}>
                <span>Deposit Status</span>
                <span
                  className={
                    order.paymentStatus === 'PAID' ? styles.paidTag : styles.pendingTag
                  }
                >
                  {order.paymentStatus === 'PAID' ? '£500.00 Paid' : 'Pending Payment'}
                </span>
              </div>
              <div className={styles.financialRow}>
                <span>Balance Due at Delivery</span>
                <strong>
                  £{(order.paymentStatus === 'PAID'
                    ? Math.max(0, order.totalAmount - 500)
                    : order.totalAmount
                  ).toFixed(2)}
                </strong>
              </div>
            </div>

            {/* Department Actions */}
            <div className={styles.dossierActions}>
              <div className={styles.stageSelectWrap}>
                <label className={styles.dossierLabel}>ADVANCE PIPELINE STAGE</label>
                <div className={styles.stageBtnRow}>
                  {['QUOTED', 'CONFIRMED', 'IN_PREP', 'DISPATCHED', 'COMPLETED'].map((st) => (
                    <button
                      key={st}
                      className={`${styles.stagePill} ${
                        currentStatus === st ? styles.stagePillActive : ''
                      }`}
                      onClick={() => onStatusChange(order.id, st)}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.actionBtnRow}>
                <button
                  className={styles.printSlipBtn}
                  onClick={() => window.print()}
                >
                  <Printer size={13} />
                  <span>Print KOT Slip</span>
                </button>

                <a
                  href={`tel:${order.customer?.phoneNumber}`}
                  className={styles.callHostBtn}
                >
                  <Phone size={13} />
                  <span>Call Host Direct</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
