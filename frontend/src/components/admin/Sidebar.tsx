import React from 'react';
import {
  Calendar,
  Table,
  ShieldAlert,
  BookOpen,
  Truck,
  Radio,
  UserCheck,
  X,
} from 'lucide-react';
import { RoyalCrest } from '../common/RoyalCrest.tsx';
import styles from './Sidebar.module.css';

export type AdminViewType = 'pipeline' | 'kitchen' | 'escalations' | 'menu_catalog' | 'logistics';

interface SidebarProps {
  currentView: AdminViewType;
  onViewChange: (view: AdminViewType) => void;
  pendingHandoffCount: number;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onViewChange,
  pendingHandoffCount,
  isOpen = false,
  onClose,
}) => {
  const handleItemClick = (view: AdminViewType) => {
    onViewChange(view);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className={styles.mobileBackdrop}
          onClick={onClose}
          aria-label="Close mobile menu"
        />
      )}

      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
        {/* Brand Header */}
        <div className={styles.brandArea}>
          <div className={styles.brandLeft}>
            <div className={styles.crestWrap}>
              <RoyalCrest size={38} />
            </div>
            <div className={styles.brandInfo}>
              <div className={styles.brandTitle}>DIL SE</div>
              <div className={styles.brandSubtitle}>ROYAL CULINARY OPS • LONDON</div>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            className={styles.mobileCloseBtn}
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Main Navigation */}
        <div className={styles.navSections}>
          <div>
            <div className={styles.sectionLabel}>Operations & Triage</div>
            <div className={styles.navGroup}>
              <button
                className={`${styles.navItem} ${currentView === 'pipeline' ? styles.navItemActive : ''}`}
                onClick={() => handleItemClick('pipeline')}
              >
                <div className={styles.navItemContent}>
                  <Calendar size={17} className={styles.navIcon} />
                  <span>Live Dispatch Schedule</span>
                </div>
              </button>

              <button
                className={`${styles.navItem} ${currentView === 'kitchen' ? styles.navItemActive : ''}`}
                onClick={() => handleItemClick('kitchen')}
              >
                <div className={styles.navItemContent}>
                  <Table size={17} className={styles.navIcon} />
                  <span>Master Operations Sheet</span>
                </div>
              </button>

              <button
                className={`${styles.navItem} ${currentView === 'escalations' ? styles.navItemActive : ''}`}
                onClick={() => handleItemClick('escalations')}
              >
                <div className={styles.navItemContent}>
                  <ShieldAlert size={17} className={styles.navIcon} />
                  <span>Concierge Escalations</span>
                </div>
                {pendingHandoffCount > 0 && (
                  <span className={styles.badgeAlert}>{pendingHandoffCount}</span>
                )}
              </button>
            </div>
          </div>

          <div>
            <div className={styles.sectionLabel}>Banqueting & Logistics</div>
            <div className={styles.navGroup}>
              <button
                className={`${styles.navItem} ${currentView === 'menu_catalog' ? styles.navItemActive : ''}`}
                onClick={() => handleItemClick('menu_catalog')}
              >
                <div className={styles.navItemContent}>
                  <BookOpen size={17} className={styles.navIcon} />
                  <span>Royal Menu & Trays</span>
                </div>
              </button>

              <button
                className={`${styles.navItem} ${currentView === 'logistics' ? styles.navItemActive : ''}`}
                onClick={() => handleItemClick('logistics')}
              >
                <div className={styles.navItemContent}>
                  <Truck size={17} className={styles.navIcon} />
                  <span>London Route Matrix</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer / Telemetry */}
        <div className={styles.sidebarBottom}>
          <div className={styles.webhookStatus}>
            <div className={styles.statusPulse}>
              <Radio size={14} className={styles.radioIcon} />
              <span className={styles.statusDot} />
            </div>
            <div className={styles.webhookInfo}>
              <div className={styles.webhookTitle}>Kabir AI Concierge</div>
              <div className={styles.webhookSub}>WhatsApp 24/7 Active • 14ms</div>
            </div>
          </div>

          <div className={styles.staffCard}>
            <div className={styles.staffAvatar}>
              <UserCheck size={16} />
            </div>
            <div className={styles.staffMeta}>
              <div className={styles.staffName}>Head Chef & Duty Officer</div>
              <div className={styles.staffRole}>Shift: London Central HQ</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
