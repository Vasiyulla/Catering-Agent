import React, { useState, useEffect } from 'react';
import { Search, Clock, RefreshCw, ChevronRight, Menu } from 'lucide-react';
import styles from './TopBar.module.css';

interface TopBarProps {
  currentView: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeFilter: string;
  onFilterChange: (f: string) => void;
  onRefresh: () => void;
  onToggleSidebar?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentView,
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  onRefresh,
  onToggleSidebar,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-GB', {
          timeZone: 'Europe/London',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' BST'
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const viewTitles: Record<string, string> = {
    pipeline: 'Live Dispatch Schedule',
    kitchen: 'Master Operations & Prep Sheet',
    escalations: 'Concierge Escalations Desk',
    menu_catalog: 'Royal Menu & Tray Guide',
    logistics: 'London Route Matrix',
  };

  return (
    <header className={styles.topBar}>
      <div className={styles.leftGroup}>
        {onToggleSidebar && (
          <button
            className={styles.menuToggleBtn}
            onClick={onToggleSidebar}
            aria-label="Toggle navigation drawer"
          >
            <Menu size={16} />
          </button>
        )}

        <div className={styles.breadcrumbs}>
          <span className={styles.crumbRoot}>DIL SE</span>
          <ChevronRight size={12} className={styles.crumbDivider} />
          <span className={styles.crumbActive}>{viewTitles[currentView] || 'Console'}</span>
        </div>

        <div className={styles.liveSyncPill}>
          <span className={styles.pulsingDot} />
          <span className={styles.liveSyncText}>Hub NW10 • Active</span>
        </div>

        <div className={styles.searchWrapper}>
          <Search size={14} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search host, phone, or postcode... (press /)"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={styles.searchInput}
          />
          <kbd className={styles.searchHotkey}>/</kbd>
        </div>

        {/* Clean Segmented Filter Bar */}
        <div className={styles.segmentedControl}>
          {['All', 'This Weekend', 'Mixed 60/40', 'Urgent'].map((f) => (
            <button
              key={f}
              className={`${styles.segmentBtn} ${activeFilter === f ? styles.segmentBtnActive : ''}`}
              onClick={() => onFilterChange(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.rightGroup}>
        <div className={styles.clockBadge}>
          <Clock size={12} className={styles.clockIcon} />
          <span className={styles.clockText}>{timeStr || 'London Time'}</span>
        </div>

        <button
          className={`${styles.syncBtn} ${isRefreshing ? styles.syncSpinning : ''}`}
          onClick={handleRefreshClick}
          title="Refresh live orders & telemetry feed"
        >
          <RefreshCw size={12} className={styles.syncIcon} />
          <span className={styles.syncBtnText}>Sync Feed</span>
        </button>
      </div>
    </header>
  );
};
