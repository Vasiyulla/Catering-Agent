import React from 'react';
import { TrendingUp, Users, Flame, ShieldAlert, Sparkles } from 'lucide-react';
import { EnterpriseOrder, DashboardStats } from '../../types/index.ts';
import styles from './StatsBar.module.css';

interface StatsBarProps {
  stats: DashboardStats;
  orders?: EnterpriseOrder[];
}

export const StatsBar: React.FC<StatsBarProps> = ({ stats, orders = [] }) => {
  const calculatedRevenue = orders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
  const revenueDisplay = stats.totalRevenue > 0 ? stats.totalRevenue : calculatedRevenue;

  const totalGuests = orders.reduce((acc, o) => acc + (o.event?.guestCount || 0), 0);
  const activeBatches = orders.filter(
    (o) => o.event?.status === 'CONFIRMED' || o.event?.status === 'IN_PREP'
  ).length;
  const escalations = stats.pendingHandoffs ?? 0;

  const feastCount = orders.filter((o) => o.orderMode === 'FEAST_PACKAGE').length;
  const trayCount = orders.filter((o) => o.orderMode === 'A_LA_CARTE_TRAYS').length;

  const halalGuests = orders
    .filter((o) => (o.event?.dietaryPreference || '').toLowerCase().includes('halal'))
    .reduce((acc, o) => acc + (o.event?.guestCount || 0), 0);
  const vegGuests = orders
    .filter((o) => (o.event?.dietaryPreference || '').toLowerCase().includes('veg'))
    .reduce((acc, o) => acc + (o.event?.guestCount || 0), 0);

  return (
    <div className={styles.statsBar}>
      {/* Metric 1: Revenue Ledger */}
      <div className={styles.statCard}>
        <div className={styles.cardHeader}>
          <span className={styles.statLabel}>CONFIRMED GROSS PIPELINE</span>
          <div className={styles.statIconWrap}>
            <TrendingUp size={16} className={styles.iconGold} />
          </div>
        </div>
        <div className={styles.statValueRow}>
          <span className={styles.currencySymbol}>£</span>
          <span className={styles.statValue}>
            {revenueDisplay.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className={styles.cardFooter}>
          <span className={styles.trendTag}>
            <Sparkles size={11} /> Live Pipeline
          </span>
          <span className={styles.subText}>
            {feastCount} Feast Package{feastCount === 1 ? '' : 's'} • {trayCount} Tray Run{trayCount === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Metric 2: Banquet Covers */}
      <div className={styles.statCard}>
        <div className={styles.cardHeader}>
          <span className={styles.statLabel}>TODAY'S BANQUET COVERS</span>
          <div className={styles.statIconWrap}>
            <Users size={16} className={styles.iconEmerald} />
          </div>
        </div>
        <div className={styles.statValueRow}>
          <span className={styles.statValue}>{totalGuests}</span>
          <span className={styles.unitText}>Guests</span>
        </div>
        <div className={styles.cardFooter}>
          <span className={styles.neutralTag}>London Venues</span>
          <span className={styles.subText}>
            {halalGuests} Halal • {vegGuests} Pure-Veg
          </span>
        </div>
      </div>

      {/* Metric 3: Kitchen Production */}
      <div className={styles.statCard}>
        <div className={styles.cardHeader}>
          <span className={styles.statLabel}>LIVE KITCHEN DEG STOVES</span>
          <div className={styles.statIconWrap}>
            <Flame size={16} className={styles.iconSaffron} />
          </div>
        </div>
        <div className={styles.statValueRow}>
          <span className={styles.statValue}>{activeBatches}</span>
          <span className={styles.unitText}>Batches Queued</span>
        </div>
        <div className={styles.cardFooter}>
          <span className={styles.saffronTag}>{activeBatches > 0 ? 'Active Shift' : 'Idle Shift'}</span>
          <span className={styles.subText}>
            {activeBatches > 0 ? `${activeBatches} handis cooking` : 'Awaiting next batch'}
          </span>
        </div>
      </div>

      {/* Metric 4: Human Escalations Desk */}
      <div className={`${styles.statCard} ${escalations > 0 ? styles.alertCard : ''}`}>
        <div className={styles.cardHeader}>
          <span className={`${styles.statLabel} ${escalations > 0 ? styles.alertLabel : ''}`}>
            CONCIERGE ESCALATIONS
          </span>
          <div className={`${styles.statIconWrap} ${escalations > 0 ? styles.alertIconWrap : ''}`}>
            <ShieldAlert size={16} className={escalations > 0 ? styles.iconAlert : styles.iconMuted} />
          </div>
        </div>
        <div className={styles.statValueRow}>
          <span className={`${styles.statValue} ${escalations > 0 ? styles.alertValue : ''}`}>
            {escalations}
          </span>
          <span className={styles.unitText}>Awaiting Review</span>
        </div>
        <div className={styles.cardFooter}>
          <span className={escalations > 0 ? styles.urgentTag : styles.neutralTag}>
            {escalations > 0 ? 'Action Required' : 'All Clear'}
          </span>
          <span className={styles.subText}>
            {escalations > 0 ? 'VIP host bespoke menu modification' : 'Kabir AI triage running 100%'}
          </span>
        </div>
      </div>
    </div>
  );
};
