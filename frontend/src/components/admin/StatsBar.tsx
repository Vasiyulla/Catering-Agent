import React from 'react';
import { TrendingUp, Users, Flame, ShieldAlert, Sparkles } from 'lucide-react';
import { DashboardStats } from '../../types/index.ts';
import styles from './StatsBar.module.css';

interface StatsBarProps {
  stats: DashboardStats;
}

export const StatsBar: React.FC<StatsBarProps> = ({ stats }) => {
  const revenueDisplay = (stats.totalRevenue && stats.totalRevenue > 0)
    ? stats.totalRevenue
    : 18450;

  const totalGuests = 540;
  const activeBatches = 14;
  const escalations = stats.pendingHandoffs || 1;

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
            <Sparkles size={11} /> +24% vs last week
          </span>
          <span className={styles.subText}>4 Grand Receptions • 8 Tray Runs</span>
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
          <span className={styles.subText}>320 Halal Meat / 220 Pure-Veg</span>
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
          <span className={styles.unitText}>Handis Active</span>
        </div>
        <div className={styles.cardFooter}>
          <span className={styles.saffronTag}>Full Fire Shift</span>
          <span className={styles.subText}>Biryani Dum Handis & Tandoor Live</span>
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
