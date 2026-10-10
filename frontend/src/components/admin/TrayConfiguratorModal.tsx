import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Minus,
  Crown,
  Copy,
  Check,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { MenuItem } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import styles from './TrayConfiguratorModal.module.css';

export interface TrayConfiguratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: MenuItem[];
  onOrderCreated?: () => void;
  initialHostName?: string;
  initialPhone?: string;
  initialGuestCount?: number;
}

export const TrayConfiguratorModal: React.FC<TrayConfiguratorModalProps> = ({
  isOpen,
  onClose,
  menuItems = [],
  onOrderCreated,
  initialHostName = 'Valued Host',
  initialPhone = '+44 7',
  initialGuestCount = 40,
}) => {
  const [hostName, setHostName] = useState<string>(initialHostName);
  const [phoneNumber, setPhoneNumber] = useState<string>(initialPhone);
  const [guestCount, setGuestCount] = useState<number>(initialGuestCount);
  const [eventDate, setEventDate] = useState<string>(
    new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]
  );
  const [servingTime, setServingTime] = useState<string>('18:30 BST');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [previewTab, setPreviewTab] = useState<'card' | 'raw'>('card');
  const [copied, setCopied] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Selected tray quantities: { [itemId]: quantity }
  const [selectedTrays, setSelectedTrays] = useState<Record<string, number>>(() => {
    // Sensible initial balanced starter configuration
    const initial: Record<string, number> = {};
    const biryani = menuItems.find((i) => i.name.toLowerCase().includes('biryani'));
    const curry = menuItems.find((i) => i.name.toLowerCase().includes('butter chicken'));
    const paneer = menuItems.find((i) => i.name.toLowerCase().includes('paneer'));
    const naan = menuItems.find((i) => i.name.toLowerCase().includes('naan'));

    if (biryani) initial[biryani.id] = 2;
    if (curry) initial[curry.id] = 2;
    if (paneer) initial[paneer.id] = 1;
    if (naan) initial[naan.id] = 4;
    return initial;
  });

  const categories = useMemo(() => {
    const cats = Array.from(new Set(menuItems.map((i) => i.category || 'Mains')));
    return ['All', ...cats];
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    if (activeCategory === 'All') return menuItems;
    return menuItems.filter((i) => i.category === activeCategory);
  }, [menuItems, activeCategory]);

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setSelectedTrays((prev) => {
      const current = prev[itemId] || 0;
      const next = Math.max(0, current + delta);
      const updated = { ...prev };
      if (next === 0) {
        delete updated[itemId];
      } else {
        updated[itemId] = next;
      }
      return updated;
    });
  };

  // Calculations
  const selectedList = useMemo(() => {
    return Object.entries(selectedTrays)
      .map(([id, qty]) => {
        const item = menuItems.find((i) => i.id === id);
        return item ? { ...item, quantity: qty } : null;
      })
      .filter(Boolean) as Array<MenuItem & { quantity: number }>;
  }, [selectedTrays, menuItems]);

  const totalAmount = useMemo(() => {
    return selectedList.reduce((acc, item) => {
      const price = item.trayPrice || item.unitPrice || 45;
      return acc + price * item.quantity;
    }, 0);
  }, [selectedList]);

  const totalTrayServes = useMemo(() => {
    return selectedList.reduce((acc, item) => {
      return acc + (item.servesGuests || 10) * item.quantity;
    }, 0);
  }, [selectedList]);

  const costPerGuest = guestCount > 0 ? totalAmount / guestCount : 0;
  const depositRequired = (totalAmount * 0.5).toFixed(2);

  // Grouped manifest by category
  const groupedManifest = useMemo(() => {
    const groups: Record<string, Array<{ name: string; qty: number; isHalal?: boolean; isVeg?: boolean }>> = {};
    selectedList.forEach((item) => {
      const cat = item.category || 'Party Trays';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push({
        name: item.name,
        qty: item.quantity,
        isHalal: item.isHalal,
        isVeg: item.isVegetarian,
      });
    });
    return groups;
  }, [selectedList]);

  // Generate Fancy WhatsApp Text
  const formattedWhatsAppText = useMemo(() => {
    let text = `👑 *DIL SE CATERING • ROYAL BANQUET SPECIFICATION* 👑\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📋 *Host:* ${hostName}\n`;
    text += `👥 *Covers:* ${guestCount} Guests  |  📅 *Date:* ${eventDate} (${servingTime})\n`;
    text += `🍱 *Format:* Bespoke Executive Bulk Party Trays\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    text += `✨ *CURATED CATERING MANIFEST:*\n`;
    Object.entries(groupedManifest).forEach(([cat, items]) => {
      text += `🔸 *${cat.toUpperCase()}*\n`;
      items.forEach((i) => {
        const tag = i.isHalal ? ' [Halal]' : i.isVeg ? ' [Pure-Veg]' : '';
        text += `   • ${i.qty}x ${i.name}${tag}\n`;
      });
      text += `\n`;
    });

    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💰 *Total Quote:* £${totalAmount.toFixed(2)} (£${costPerGuest.toFixed(2)}/guest)\n`;
    text += `🔒 *50% Deposit to Lock Schedule:* £${depositRequired}\n`;
    text += `✨ *Includes Commercial Chafing Warmers, Burner Fuel & Setup*\n`;
    text += `🛡️ *100% British Halal Certified & Segregated Pure-Veg Cookware*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `_Dil Se London Concierge — Reply *CONFIRM* to lock into kitchen staging._`;
    return text;
  }, [hostName, guestCount, eventDate, servingTime, groupedManifest, totalAmount, costPerGuest, depositRequired]);

  const handleCopyWhatsApp = () => {
    navigator.clipboard.writeText(formattedWhatsAppText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = async () => {
    if (!phoneNumber || phoneNumber.length < 8) {
      alert('Please specify a valid customer phone number.');
      return;
    }
    const ok = await api.sendMessage(phoneNumber, formattedWhatsAppText);
    if (ok) {
      setToastMessage(`Royal Menu dispatched to ${phoneNumber} on WhatsApp!`);
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  const handleLockOrder = async () => {
    setIsSubmitting(true);
    const summary = selectedList.map((i) => `${i.quantity}x ${i.name}`).join(', ');

    const res = await api.createOrder({
      customerName: hostName,
      phoneNumber,
      eventType: 'Bespoke Feast Tray Booking',
      eventDate,
      servingTime,
      guestCount,
      orderMode: 'A_LA_CARTE_TRAYS',
      totalAmount,
      itemsSummary: summary,
      dietaryPreference: 'Custom Configured Trays (Halal / Veg Balanced)',
    });

    setIsSubmitting(false);
    if (res.success) {
      setToastMessage('Order locked into Live Dispatch Schedule!');
      onOrderCreated?.();
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTitleGroup}>
            <div className={styles.superTitle}>
              <Crown size={14} />
              <span>BESPOKE CULINARY STUDIO</span>
            </div>
            <h3 className={styles.mainTitle}>Custom Party Tray & Feast Menu Configurator</h3>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className={styles.modalBody}>
          {/* Left: Tray Selection Matrix */}
          <div className={styles.configuratorPane}>
            {/* Controls Bar */}
            <div className={styles.controlsBar}>
              <div className={styles.controlField}>
                <label>Host Name</label>
                <input
                  type="text"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                />
              </div>

              <div className={styles.controlField}>
                <label>WhatsApp Number</label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+44 7..."
                />
              </div>

              <div className={styles.controlField}>
                <label>Guest Covers ({guestCount}p)</label>
                <input
                  type="number"
                  min="10"
                  max="500"
                  step="5"
                  value={guestCount}
                  onChange={(e) => setGuestCount(parseInt(e.target.value) || 20)}
                />
              </div>

              <div className={styles.controlField}>
                <label>Event Date</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </div>

              <div className={styles.controlField}>
                <label>Serving Time</label>
                <input
                  type="text"
                  value={servingTime}
                  onChange={(e) => setServingTime(e.target.value)}
                  placeholder="e.g. 18:30 BST"
                />
              </div>
            </div>

            {/* Category Navigation */}
            <div className={styles.categoryNav}>
              {categories.map((cat) => (
                <button
                  key={cat}
                  className={`${styles.catBtn} ${activeCategory === cat ? styles.catBtnActive : ''}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Dishes Selection Grid */}
            <div className={styles.dishesGrid}>
              {filteredItems.map((item) => {
                const qty = selectedTrays[item.id] || 0;
                const price = item.trayPrice || item.unitPrice || 45;

                return (
                  <div
                    key={item.id}
                    className={`${styles.dishCard} ${qty > 0 ? styles.dishCardSelected : ''}`}
                  >
                    <div className={styles.dishTop}>
                      <h4 className={styles.dishName}>{item.name}</h4>
                      <div className={styles.dishTags}>
                        {item.isHalal && <span className={styles.tagHalal}>British Halal</span>}
                        {item.isVegetarian && <span className={styles.tagVeg}>Pure Veg</span>}
                      </div>
                      <p className={styles.dishDesc}>{item.description}</p>
                    </div>

                    <div className={styles.dishBottom}>
                      <div className={styles.priceCol}>
                        <span className={styles.pricePerTray}>£{price.toFixed(2)}</span>
                        <span className={styles.priceServes}>Feeds ~{item.servesGuests || 10} covers</span>
                      </div>

                      <div className={styles.stepper}>
                        <button
                          className={styles.stepperBtn}
                          onClick={() => handleUpdateQuantity(item.id, -1)}
                          disabled={qty === 0}
                        >
                          <Minus size={11} />
                        </button>
                        <span className={styles.stepperCount}>{qty}</span>
                        <button
                          className={styles.stepperBtn}
                          onClick={() => handleUpdateQuantity(item.id, 1)}
                        >
                          <Plus size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Live Summary & Fancy Royal Card Preview */}
          <div className={styles.summaryPane}>
            <div className={styles.summaryHeader}>
              <h4>Royal Menu Preview</h4>
              <div className={styles.tabSwitch}>
                <button
                  className={`${styles.tabSwitchBtn} ${previewTab === 'card' ? styles.tabSwitchActive : ''}`}
                  onClick={() => setPreviewTab('card')}
                >
                  Royal Card
                </button>
                <button
                  className={`${styles.tabSwitchBtn} ${previewTab === 'raw' ? styles.tabSwitchActive : ''}`}
                  onClick={() => setPreviewTab('raw')}
                >
                  WhatsApp Text
                </button>
              </div>
            </div>

            {/* Card Preview */}
            <div className={styles.royalCardContainer}>
              {previewTab === 'card' ? (
                <div className={styles.royalMenuCard}>
                  <div className={styles.royalCardCrest}>
                    <Crown size={22} className={styles.crestIcon} />
                    <span className={styles.crestTitle}>DIL SE CULINARY OPERATIONS</span>
                    <span className={styles.crestSubtitle}>LONDON • MICHELIN-GRADE BANQUETING</span>
                  </div>

                  <div className={styles.royalHostInfo}>
                    <div className={styles.hostField}>
                      <strong>Host</strong>
                      <span>{hostName}</span>
                    </div>
                    <div className={styles.hostField}>
                      <strong>Event Date</strong>
                      <span>{eventDate}</span>
                    </div>
                    <div className={styles.hostField}>
                      <strong>Covers</strong>
                      <span>{guestCount} Guests</span>
                    </div>
                    <div className={styles.hostField}>
                      <strong>Serving Time</strong>
                      <span>{servingTime}</span>
                    </div>
                  </div>

                  {/* Manifest Grouping */}
                  <div className={styles.royalManifestList}>
                    {Object.keys(groupedManifest).length === 0 ? (
                      <p style={{ textAlign: 'center', opacity: 0.6, fontSize: '12px' }}>
                        No trays selected. Add dishes on the left to build the feast.
                      </p>
                    ) : (
                      Object.entries(groupedManifest).map(([cat, items]) => (
                        <div key={cat} className={styles.courseCategory}>
                          <span className={styles.courseCategoryTitle}>{cat}</span>
                          {items.map((it, idx) => (
                            <div key={idx} className={styles.courseItemLine}>
                              <span>{it.name}</span>
                              <strong>{it.qty}x Tray</strong>
                            </div>
                          ))}
                        </div>
                      ))
                    )}
                  </div>

                  <div className={styles.royalCardFooter}>
                    <div className={styles.royalPriceBlock}>
                      <span className={totalAmount > 0 ? styles.totalLabel : ''}>Quote Total</span>
                      <span className={styles.totalVal}>£{totalAmount.toFixed(2)}</span>
                      <span className={styles.depositTag}>
                        Yields ~{totalTrayServes} covers (£{costPerGuest.toFixed(2)}/head) • 50% Deposit: £{depositRequired}
                      </span>
                    </div>
                    <div className={styles.royalSealBadge}>
                      Certified British Halal • Segregated
                    </div>
                  </div>
                </div>
              ) : (
                <textarea
                  readOnly
                  value={formattedWhatsAppText}
                  style={{
                    width: '100%',
                    height: '380px',
                    borderRadius: '12px',
                    background: '#0f172a',
                    color: '#f8fafc',
                    padding: '16px',
                    fontSize: '12px',
                    lineHeight: '1.5',
                    border: '1px solid #334155',
                    fontFamily: 'monospace',
                    resize: 'none',
                  }}
                />
              )}
            </div>

            {/* Actions Bar */}
            <div className={styles.actionsBar}>
              {toastMessage && <div className={styles.toastPill}>{toastMessage}</div>}

              <div className={styles.btnGroup}>
                <button className={styles.copyBtn} onClick={handleCopyWhatsApp}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                </button>

                <button className={styles.whatsappSendBtn} onClick={handleSendWhatsApp}>
                  <Send size={14} />
                  <span>Send WhatsApp</span>
                </button>
              </div>

              <button
                className={styles.bookOrderBtn}
                disabled={isSubmitting || totalAmount === 0}
                onClick={handleLockOrder}
              >
                <ShieldCheck size={16} />
                <span>{isSubmitting ? 'Securing Schedule...' : 'Lock into Live Schedule ➔'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
