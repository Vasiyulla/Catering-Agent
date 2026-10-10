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
  UserCog,
  Bot,
  Activity,
  Cpu,
  Check,
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
  const [mobileTab, setMobileTab] = useState<'chat' | 'dossier' | 'telemetry'>('chat');
  const [activeRightTab, setActiveRightTab] = useState<'dossier' | 'telemetry'>('telemetry');
  const [isQuoteApproved, setIsQuoteApproved] = useState<boolean>(false);

  useEffect(() => {
    if (!order) return;
    const customer = order.customer;
    if (!customer?.phoneNumber) return;

    let isCurrent = true;
    api.getMessages(customer.phoneNumber).then((res) => {
      if (isCurrent) {
        setMessages(res.messages || []);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [order]);

  if (!order) return null;

  const currentStatus = order.event?.status || 'QUOTED';

  const handleSendReply = async () => {
    if (!composerText.trim() || !order.customer?.phoneNumber) return;

    const text = composerText.trim();
    const phone = order.customer.phoneNumber;

    const newMsg: EnterpriseMessage = {
      id: `m-${Date.now()}`,
      phoneNumber: phone,
      direction: 'OUTBOUND',
      messageText: text,
      createdAt: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setComposerText('');

    await api.sendMessage(phone, text);
  };

  const handleQuickInsert = (text: string) => {
    setComposerText(text);
  };

  const handleApproveQuote = () => {
    setIsQuoteApproved(true);
    setComposerText(
      `Official Dil Se Quotation Approved: £${order.totalAmount.toFixed(2)} all-inclusive. You can secure your date with a £500 deposit via https://pay.dilse.co.uk/invoice-${order.id}`
    );
  };

  const handleInsertMenuCard = async () => {
    try {
      const cardRes = await api.generateMenuCard({
        hostName: order.customer?.name || 'Valued Guest',
        guestCount: order.event?.guestCount || 50,
        eventDate: order.event?.eventDate || 'Upcoming Banquet',
        totalAmount: order.totalAmount,
        packageId: order.selectedPackageId || 'MAHARAJA_FEAST',
      });

      if (cardRes.success && cardRes.cardData?.whatsappText) {
        setComposerText(cardRes.cardData.whatsappText);
      } else {
        setComposerText(
          `✨ *DIL SE CULINARY OPERATIONS • ROYAL FEAST MENU* ✨\n🏛️ London Hub NW10 • 100% British Halal Certified\n\n🍢 *STARTERS*: Amritsari Fish Tikka, Seekh Kebab, Paneer Tikka\n🥘 *MAINS*: Railway Lamb Curry, Butter Chicken, Paneer Butter Masala\n🍚 *RICE*: Lucknowi Lamb Dum Biryani\n🍮 *DESSERT*: Warm Shahi Gulab Jamun\n\n📦 Large Chafing Trays (Serves 10 covers each)\nTotal: £${order.totalAmount.toFixed(2)} all-inclusive.\nCustomise your tray selection: https://dilse.co.uk/configurator`
        );
      }
    } catch {
      setComposerText(
        `✨ *DIL SE CULINARY OPERATIONS • ROYAL FEAST MENU* ✨\nTotal: £${order.totalAmount.toFixed(2)} all-inclusive.\nCustomise your tray selection: https://dilse.co.uk/configurator`
      );
    }
  };

  return (
    <div className={styles.drawerBackdrop} onClick={onClose}>
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        {/* Crisp Header */}
        <div className={styles.drawerHeader}>
          <div className={styles.headerLeft}>
            <div className={styles.customerMeta}>
              <div className={styles.nameRow}>
                <h3 className={styles.custTitle}>{order.customer?.name}</h3>
                <span className={styles.verifiedChip}>
                  <CheckCircle2 size={11} />
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
                  <UserCog size={12} />
                  <span>Staff Takeover (AI Paused)</span>
                </>
              ) : (
                <>
                  <Bot size={12} />
                  <span>LangGraph Engine Active</span>
                </>
              )}
            </button>
          </div>

          <button className={styles.closeBtn} onClick={onClose} aria-label="Close drawer">
            <X size={16} />
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
            WhatsApp Stream
          </button>
          <button
            className={`${styles.mobileTabBtn} ${
              mobileTab === 'telemetry' ? styles.mobileTabBtnActive : ''
            }`}
            onClick={() => setMobileTab('telemetry')}
          >
            Agent Telemetry
          </button>
          <button
            className={`${styles.mobileTabBtn} ${
              mobileTab === 'dossier' ? styles.mobileTabBtnActive : ''
            }`}
            onClick={() => setMobileTab('dossier')}
          >
            Banquet Dossier
          </button>
        </div>

        {/* Studio Dual Body */}
        <div className={styles.studioBody}>
          {/* Left Column: WhatsApp Live Operations (55% width) */}
          <div
            className={`${styles.chatColumn} ${
              mobileTab === 'chat' ? styles.columnVisible : styles.columnHiddenMobile
            }`}
          >
            <div className={styles.chatTelemetryNotice}>
              <span className={styles.pulseDot} />
              <span>Encrypted WhatsApp Cloud Stream • 12ms sync • Deterministic Guard</span>
            </div>

            <div className={styles.messagesList}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 20px', color: '#64748b' }}>
                  <p style={{ margin: 0, fontSize: '13.5px', fontWeight: 500, color: '#475569' }}>
                    No recorded WhatsApp messages for this host yet.
                  </p>
                  <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                    Type a message below to contact host directly, or incoming messages will appear here in real-time.
                  </p>
                </div>
              ) : (
                messages.map((m) => {
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
                            <CheckCheck size={12} className={styles.readTicks} />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Action Triggers */}
            <div className={styles.quickTriggers}>
              <button
                className={styles.triggerChip}
                onClick={handleInsertMenuCard}
                title="Insert formatted Royal Banquet Menu Card into WhatsApp reply"
              >
                ✨ Royal Menu Card
              </button>
              <button
                className={styles.triggerChip}
                onClick={() =>
                  handleQuickInsert(
                    `Namaste! Your Dil Se banquet quote of £${order.totalAmount.toFixed(2)} is ready. Secure with £500 deposit: https://pay.dilse.co.uk/invoice-${order.id}`
                  )
                }
              >
                Deposit Link (£500)
              </button>
              <button
                className={styles.triggerChip}
                onClick={() =>
                  handleQuickInsert(
                    'All dishes are 100% British Halal Certified (HMC audited) and cooked in dedicated spice vessels.'
                  )
                }
              >
                Halal Protocol Seal
              </button>
              <button
                className={styles.triggerChip}
                onClick={() =>
                  handleQuickInsert(
                    'Could you confirm if the banquet venue provides a service lift for our heated chafing carts?'
                  )
                }
              >
                Service Lift Check
              </button>
            </div>

            {/* Live Message Composer */}
            <div className={styles.composerBar}>
              <input
                type="text"
                placeholder={
                  isStaffTakeover
                    ? 'Type reply as Expeditor on WhatsApp...'
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
                <Send size={13} />
              </button>
            </div>
          </div>

          {/* Right Column: Telemetry & Dossier (45% width) */}
          <div
            className={`${styles.dossierColumn} ${
              mobileTab !== 'chat' ? styles.columnVisible : styles.columnHiddenMobile
            }`}
          >
            {/* Sub-Tabs for Right Pane: Telemetry vs Dossier */}
            <div className={styles.paneSegmentBar}>
              <button
                className={`${styles.paneSegmentBtn} ${
                  activeRightTab === 'telemetry' ? styles.paneSegmentBtnActive : ''
                }`}
                onClick={() => setActiveRightTab('telemetry')}
              >
                <Cpu size={12} />
                <span>Agent Thought Telemetry</span>
              </button>
              <button
                className={`${styles.paneSegmentBtn} ${
                  activeRightTab === 'dossier' ? styles.paneSegmentBtnActive : ''
                }`}
                onClick={() => setActiveRightTab('dossier')}
              >
                <Calendar size={12} />
                <span>Event Dossier & Ledger</span>
              </button>
            </div>

            {activeRightTab === 'telemetry' ? (
              /* Telemetry Inspector: LangGraph Execution Steps */
              <div className={styles.telemetryInspector}>
                {/* HITL Review Callout */}
                <div className={styles.hitlBanner}>
                  <div className={styles.hitlBannerHeader}>
                    <div className={styles.hitlIconWrap}>
                      <Activity size={13} className={styles.hitlIcon} />
                    </div>
                    <div>
                      <div className={styles.hitlTitle}>Human-in-the-Loop Review Active</div>
                      <div className={styles.hitlDesc}>
                        LangGraph paused at checkpoint. Awaiting pricing and buffer confirmation.
                      </div>
                    </div>
                  </div>
                  <div className={styles.hitlActions}>
                    <button
                      className={`${styles.approveBtn} ${isQuoteApproved ? styles.approvedState : ''}`}
                      onClick={handleApproveQuote}
                    >
                      {isQuoteApproved ? (
                        <>
                          <Check size={12} />
                          <span>Quote Approved & Staged</span>
                        </>
                      ) : (
                        <>
                          <span>Approve & Stage Quote (£{order.totalAmount.toFixed(2)})</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Step Trace Tree */}
                <div className={styles.traceTree}>
                  <div className={styles.traceNode}>
                    <div className={styles.traceNodeHeader}>
                      <span className={styles.nodeStepBadge}>Step 1</span>
                      <span className={styles.nodeName}>Intent & Slot Extraction</span>
                      <span className={styles.nodeLatency}>142ms • 98% conf</span>
                    </div>
                    <div className={styles.nodeBody}>
                      <div className={styles.tokenRow}>
                        <span className={styles.tokenKey}>intent:</span>
                        <span className={styles.tokenVal}>quote_inquiry_with_dietary_cushion</span>
                      </div>
                      <div className={styles.tokenRow}>
                        <span className={styles.tokenKey}>covers:</span>
                        <span className={styles.tokenVal}>{order.event?.guestCount || 80} Pax</span>
                      </div>
                      <div className={styles.tokenRow}>
                        <span className={styles.tokenKey}>postcode:</span>
                        <span className={styles.tokenVal}>{order.customer?.postcode || 'HA9 9AA'}</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.traceNode}>
                    <div className={styles.traceNodeHeader}>
                      <span className={styles.nodeStepBadge}>Step 2</span>
                      <span className={styles.nodeName}>Host Protection & Cushion Audit</span>
                      <span className={styles.nodeLatency}>88ms • Guard Passed</span>
                    </div>
                    <div className={styles.nodeBody}>
                      <div className={styles.tokenRow}>
                        <span className={styles.tokenKey}>cushionRule:</span>
                        <span className={styles.tokenVal}>+40% Shahi Paneer buffer added</span>
                      </div>
                      <div className={styles.tokenRow}>
                        <span className={styles.tokenKey}>halalAudit:</span>
                        <span className={styles.tokenVal}>100% British Halal certified HMC</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.traceNode}>
                    <div className={styles.traceNodeHeader}>
                      <span className={styles.nodeStepBadge}>Step 3</span>
                      <span className={styles.nodeName}>Deterministic Billing Engine</span>
                      <span className={styles.nodeLatency}>12ms • Zero LLM Math</span>
                    </div>
                    <div className={styles.nodeBody}>
                      <div className={styles.tokenRow}>
                        <span className={styles.tokenKey}>perCoverPrice:</span>
                        <span className={styles.tokenVal}>
                          £{((order.totalAmount || 1440) / (order.event?.guestCount || 80)).toFixed(2)}/pp
                        </span>
                      </div>
                      <div className={styles.tokenRow}>
                        <span className={styles.tokenKey}>chafersIncluded:</span>
                        <span className={styles.tokenVal}>4x Stainless Warmers + Burner Gels</span>
                      </div>
                      <div className={styles.tokenRow}>
                        <span className={styles.tokenKey}>grossTotal:</span>
                        <span className={styles.tokenValBold}>£{order.totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Culinary Dossier & Ledger */
              <div className={styles.dossierContentWrap}>
                <div className={styles.dossierCard}>
                  <div className={styles.dossierRow}>
                    <Calendar size={12} className={styles.dossierIcon} />
                    <div className={styles.dossierContent}>
                      <span className={styles.dossierLabel}>EVENT DATE</span>
                      <span className={styles.dossierVal}>
                        {order.event?.eventDate || '2026-10-11'} ({order.event?.eventType})
                      </span>
                    </div>
                  </div>

                  <div className={styles.dossierRow}>
                    <Clock size={12} className={styles.dossierIcon} />
                    <div className={styles.dossierContent}>
                      <span className={styles.dossierLabel}>SERVING TIME</span>
                      <span className={styles.dossierVal}>
                        {order.event?.servingTime || '18:30 BST'} • Chafing Buffet
                      </span>
                    </div>
                  </div>

                  <div className={styles.dossierRow}>
                    <MapPin size={12} className={styles.dossierIcon} />
                    <div className={styles.dossierContent}>
                      <span className={styles.dossierLabel}>VENUE</span>
                      <span className={styles.dossierVal}>
                        {order.event?.deliveryAddress || 'London Delivery'}
                      </span>
                    </div>
                  </div>

                  <div className={styles.dossierRow}>
                    <Users size={12} className={styles.dossierIcon} />
                    <div className={styles.dossierContent}>
                      <span className={styles.dossierLabel}>GUESTS</span>
                      <span className={styles.dossierVal}>
                        {order.event?.guestCount || 80} Covers ({order.event?.dietaryPreference})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Culinary Dishes Selection */}
                <div className={styles.dossierCard}>
                  <div className={styles.cardSectionTitle}>SELECTED MENU & DISHES</div>
                  <p className={styles.itemsSummaryText}>{order.itemsSummary}</p>
                  <div className={styles.halalNotice}>
                    <ShieldCheck size={12} className={styles.halalIcon} />
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
                    <span>Balance Due</span>
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
                          onClick={() => onStatusChange?.(order.id, st)}
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
                      <Printer size={12} />
                      <span>Print KOT Slip</span>
                    </button>

                    <a
                      href={`tel:${order.customer?.phoneNumber}`}
                      className={styles.callHostBtn}
                    >
                      <Phone size={12} />
                      <span>Call Host Direct</span>
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
