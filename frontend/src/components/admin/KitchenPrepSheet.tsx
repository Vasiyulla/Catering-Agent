import React, { useState, useMemo } from 'react';
import {
  ChefHat,
  Printer,
  Download,
  Search,
  Clock,
  ShieldCheck,
  Leaf,
  Shield,
  Copy,
  Check,
} from 'lucide-react';
import { EnterpriseOrder } from '../../types/index.ts';
import styles from './KitchenPrepSheet.module.css';

interface MasterSheetRow {
  id: string;
  dispatchTime: string;
  timeRemaining: string;
  hostName: string;
  phone: string;
  venue: string;
  postcode: string;
  covers: number;
  dietaryType: 'HALAL' | 'VEG' | 'MIXED';
  dietaryLabel: string;
  manifest: string;
  handiCount: string;
  chefLead: string;
  fleetStatus: string;
  vanNumber: string;
  totalAmount: number;
  paymentStatus: 'PAID' | 'PENDING';
  stageStatus: 'QUOTED' | 'CONFIRMED' | 'IN_PREP' | 'DISPATCHED' | 'COMPLETED';
  originalOrder?: EnterpriseOrder;
}

const DEFAULT_MOCK_ROWS: MasterSheetRow[] = [
  {
    id: '#DS-101',
    dispatchTime: '13:30 BST',
    timeRemaining: 'T-45m',
    hostName: 'Priya & Vikram Sharma',
    phone: '+44 7123 456789',
    venue: 'Wembley Grand Banqueting Hall',
    postcode: 'HA9 9AA',
    covers: 80,
    dietaryType: 'MIXED',
    dietaryLabel: 'Mixed 60/40 (Halal Meat + Veg Cushion)',
    manifest: '3x Awadhi Biryani, 2x Butter Chicken, 2x Shahi Paneer, 80x Naan',
    handiCount: 'Degh #02 & #04',
    chefLead: 'Chef Tariq (Exec)',
    fleetStatus: 'Van #02 Staged',
    vanNumber: 'Mercedes Sprinter',
    totalAmount: 1440.0,
    paymentStatus: 'PAID',
    stageStatus: 'CONFIRMED',
  },
  {
    id: '#DS-202',
    dispatchTime: '18:30 BST',
    timeRemaining: 'T-2h 15m',
    hostName: 'Rajesh & Suman Patel',
    phone: '+44 7987 654321',
    venue: 'Upton Court Road Residence',
    postcode: 'SL1 2DX',
    covers: 40,
    dietaryType: 'VEG',
    dietaryLabel: 'Strict Pure Veg (Jain Audited)',
    manifest: '3x Awadhi Biryani Trays, 2x Shahi Kadhai Paneer, 2x Dal Makhani',
    handiCount: 'Dedicated Veg Range #01',
    chefLead: 'Chef Balwinder',
    fleetStatus: 'Queued Staging Bay 1',
    vanNumber: 'Thermal Fleet #01',
    totalAmount: 485.0,
    paymentStatus: 'PENDING',
    stageStatus: 'QUOTED',
  },
  {
    id: '#DS-303',
    dispatchTime: '19:00 BST',
    timeRemaining: 'T-2h 45m',
    hostName: 'Ayesha & Tariq Khan',
    phone: '+44 7555 123456',
    venue: 'The Broadway Banquet Suite',
    postcode: 'UB1 3HE',
    covers: 60,
    dietaryType: 'HALAL',
    dietaryLabel: '100% British Halal Certified',
    manifest: 'Dil Se Classic Feast: 4x Awadhi Biryani, 3x Butter Chicken, 60x Roomali',
    handiCount: 'Degh #03 (Dum Fired)',
    chefLead: 'Chef Harpreet',
    fleetStatus: 'Staging Bay 2',
    vanNumber: 'Heated Van #03',
    totalAmount: 1160.0,
    paymentStatus: 'PAID',
    stageStatus: 'IN_PREP',
  },
  {
    id: '#DS-404',
    dispatchTime: '19:30 BST',
    timeRemaining: 'T-3h 15m',
    hostName: 'Davinder & Harpreet Gill',
    phone: '+44 7888 990011',
    venue: 'Osterley Park Pavilions',
    postcode: 'TW7 4EE',
    covers: 160,
    dietaryType: 'MIXED',
    dietaryLabel: 'Mixed 50/50 + Live Tandoor',
    manifest: '6x Dum Pukht Gosht, 4x Zafrani Paneer Korma, 160x Live Naan',
    handiCount: 'Degh #05 & #06',
    chefLead: 'Chef Kabir & Ustad Farooq',
    fleetStatus: 'En Route to Venue (ETA 19:10)',
    vanNumber: 'Mercedes Sprinter #04',
    totalAmount: 2880.0,
    paymentStatus: 'PAID',
    stageStatus: 'DISPATCHED',
  },
  {
    id: '#DS-505',
    dispatchTime: '20:00 BST',
    timeRemaining: 'Delivered',
    hostName: 'Lord & Lady Mountjoy / Gupta Corp',
    phone: '+44 7444 332211',
    venue: 'The Grosvenor House Ballroom',
    postcode: 'W1K 7TN',
    covers: 200,
    dietaryType: 'HALAL',
    dietaryLabel: 'Gourmet Mughlai • Nut-Free Audited',
    manifest: 'Royal Celebration Spread: 8x Awadhi Lamb, 6x Murgh Makhani, 200x Taftan',
    handiCount: 'Degh #07 & #08',
    chefLead: 'Chef Kabir (Head Exec)',
    fleetStatus: 'Delivered at Venue (68°C Verified)',
    vanNumber: 'Van #01 & #02',
    totalAmount: 3600.0,
    paymentStatus: 'PAID',
    stageStatus: 'COMPLETED',
  },
];

export interface KitchenPrepSheetProps {
  orders?: EnterpriseOrder[];
  onSelectOrder?: (order: EnterpriseOrder) => void;
  onAdvanceStatus?: (orderId: string, currentStatus: string) => void;
}

export const KitchenPrepSheet: React.FC<KitchenPrepSheetProps> = ({
  orders = [],
  onSelectOrder,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStation, setSelectedStation] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Dynamically derive rows from live orders prop, or fallback to default mock rows
  const rows: MasterSheetRow[] = useMemo(() => {
    if (orders && orders.length > 0) {
      return orders.map((order) => {
        const covers = order.event?.guestCount || 40;
        const dietaryRaw = (order.event?.dietaryPreference || 'Mixed 60/40').toLowerCase();
        let dietaryType: 'HALAL' | 'VEG' | 'MIXED' = 'MIXED';
        if (dietaryRaw.includes('pure veg') || dietaryRaw.includes('jain') || dietaryRaw.includes('veg')) {
          dietaryType = 'VEG';
        } else if (dietaryRaw.includes('100% halal') || dietaryRaw.includes('halal certified') || dietaryRaw.includes('halal')) {
          dietaryType = 'HALAL';
        }

        let handiCount = 'Degh #02 & #04';
        if (covers >= 150) {
          handiCount = 'Degh #07 & #08 (Triple Dum)';
        } else if (covers >= 100) {
          handiCount = 'Degh #05 & #06';
        } else if (dietaryType === 'VEG') {
          handiCount = 'Dedicated Veg Range #01';
        }

        const status = order.event?.status || 'CONFIRMED';
        let timeRemaining = 'T-2h 15m';
        if (status === 'IN_PREP') timeRemaining = 'T-45m (Dum Fired)';
        else if (status === 'DISPATCHED') timeRemaining = 'En Route';
        else if (status === 'COMPLETED') timeRemaining = 'Delivered';

        return {
          id: `#${order.id.replace('ORD-', 'DS-')}`,
          dispatchTime: order.event?.servingTime || '18:30 BST',
          timeRemaining,
          hostName: order.customer?.name || 'Valued Host',
          phone: order.customer?.phoneNumber || '+44 7000 000000',
          venue: order.event?.deliveryAddress || 'London Delivery',
          postcode: order.customer?.postcode || 'London',
          covers,
          dietaryType,
          dietaryLabel: order.event?.dietaryPreference || 'Mixed 60/40 (Halal Meat + Veg Cushion)',
          manifest: order.itemsSummary || 'Dil Se Royal Banquet Feast',
          handiCount,
          chefLead: 'Chef Tariq (Exec)',
          fleetStatus: 'Van #02 Staged',
          vanNumber: 'Mercedes Sprinter',
          totalAmount: order.totalAmount || 0,
          paymentStatus: order.paymentStatus === 'PAID' ? 'PAID' : 'PENDING',
          stageStatus: (status as any) || 'CONFIRMED',
          originalOrder: order,
        };
      });
    }
    return DEFAULT_MOCK_ROWS;
  }, [orders]);

  const handleCopyId = (code: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedId(code);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const filteredRows = rows.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      r.id.toLowerCase().includes(q) ||
      r.hostName.toLowerCase().includes(q) ||
      r.venue.toLowerCase().includes(q) ||
      r.postcode.toLowerCase().includes(q) ||
      r.chefLead.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (selectedStation === 'halal') return r.dietaryType === 'HALAL';
    if (selectedStation === 'veg') return r.dietaryType === 'VEG';
    if (selectedStation === 'prep') return r.stageStatus === 'IN_PREP';
    if (selectedStation === 'fleet') return r.stageStatus === 'DISPATCHED';

    return true;
  });

  const totalPax = filteredRows.reduce((sum, r) => sum + r.covers, 0);

  const renderDietarySeal = (type: 'HALAL' | 'VEG' | 'MIXED', label: string) => {
    if (type === 'VEG') {
      return (
        <span className={styles.sealVeg}>
          <Leaf size={10} />
          <span>{label}</span>
        </span>
      );
    }
    if (type === 'HALAL') {
      return (
        <span className={styles.sealHalal}>
          <Shield size={10} />
          <span>{label}</span>
        </span>
      );
    }
    return (
      <span className={styles.sealMixed}>
        <span className={styles.dotMixed} />
        <span>{label}</span>
      </span>
    );
  };

  const getStagePill = (status: string) => {
    switch (status) {
      case 'QUOTED':
        return <span className={styles.stageQuoted}>Concierge Quoted</span>;
      case 'CONFIRMED':
        return <span className={styles.stageConfirmed}>Deposit Secured</span>;
      case 'IN_PREP':
        return <span className={styles.stagePrep}>Dum Stoves Fired</span>;
      case 'DISPATCHED':
        return <span className={styles.stageDispatched}>Heated Fleet Transit</span>;
      case 'COMPLETED':
        return <span className={styles.stageCompleted}>Banquet Delivered</span>;
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className={styles.masterSheetContainer}>
      {/* 1. Executive Sheet Header */}
      <div className={styles.sheetHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.titleRow}>
            <ChefHat size={18} className={styles.chefHatIcon} />
            <h2 className={styles.sheetTitle}>Master Operations & Kitchen Prep Sheet</h2>
            <span className={styles.telemetryTag}>
              <Clock size={11} />
              <span>Live Order Stream • Park Royal Central HQ</span>
            </span>
          </div>
          <p className={styles.sheetSub}>
            Live Production Roster, Allergen Quarantine & Station Allocation
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            className={styles.exportBtn}
            onClick={() => window.print()}
            title="Print Production Sheet"
          >
            <Printer size={13} />
            <span>Print Master Sheet</span>
          </button>
          <button
            className={styles.csvBtn}
            onClick={() => alert('Exporting Production Manifest to CSV...')}
            title="Download CSV Manifest"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Executive KPI Metrics Databar */}
      <div className={styles.kpiDataBar}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Total Evening Covers</span>
          <div className={styles.kpiValueRow}>
            <span className={styles.kpiValue}>{totalPax} Pax</span>
            <span className={styles.kpiBufferBadge}>+40 Buffer</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Active Handi Stoves</span>
          <div className={styles.kpiValueRow}>
            <span className={styles.kpiValue}>18 Live Deghs</span>
            <span className={styles.kpiDumBadge}>85°C Atta Dum</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Dietary Segregation</span>
          <div className={styles.kpiValueRow}>
            <span className={styles.kpiValue}>100% Audited</span>
            <span className={styles.kpiBufferBadge}>Dedicated Stoves</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Expeditions On Schedule</span>
          <div className={styles.kpiValueRow}>
            <span className={styles.kpiValue}>{filteredRows.length} Feasts</span>
            <span className={styles.kpiFleetBadge}>0 Delayed</span>
          </div>
        </div>
      </div>

      {/* 3. Toolbar & Station Filters */}
      <div className={styles.sheetToolbar}>
        <div className={styles.searchBox}>
          <Search size={14} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by Slip ID, Host, Venue, Postcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.stationFilters}>
          <button
            className={`${styles.filterBtn} ${selectedStation === 'all' ? styles.filterActive : ''}`}
            onClick={() => setSelectedStation('all')}
          >
            All Expeditions ({rows.length})
          </button>
          <button
            className={`${styles.filterBtn} ${selectedStation === 'halal' ? styles.filterActive : ''}`}
            onClick={() => setSelectedStation('halal')}
          >
            British Halal
          </button>
          <button
            className={`${styles.filterBtn} ${selectedStation === 'veg' ? styles.filterActive : ''}`}
            onClick={() => setSelectedStation('veg')}
          >
            Pure Veg / Jain
          </button>
          <button
            className={`${styles.filterBtn} ${selectedStation === 'prep' ? styles.filterActive : ''}`}
            onClick={() => setSelectedStation('prep')}
          >
            On Stoves
          </button>
          <button
            className={`${styles.filterBtn} ${selectedStation === 'fleet' ? styles.filterActive : ''}`}
            onClick={() => setSelectedStation('fleet')}
          >
            Fleet Transit
          </button>
        </div>
      </div>

      {/* 4. The Master Spreadsheet Grid (Linear / Excel High-Density Style) */}
      <div className={styles.gridWrapper}>
        <table className={styles.masterTable}>
          <thead>
            <tr>
              <th style={{ width: '85px' }}>Slip ID</th>
              <th style={{ width: '125px' }}>Target Dispatch</th>
              <th style={{ width: '180px' }}>Host Contact</th>
              <th style={{ width: '210px' }}>Banqueting Venue</th>
              <th style={{ width: '220px' }}>Covers & Dietary</th>
              <th>Menu Manifest & Handi Stations</th>
              <th style={{ width: '130px', textAlign: 'center' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, idx) => (
              <tr
                key={row.id}
                className={idx % 2 === 0 ? styles.rowEven : styles.rowOdd}
                style={{ cursor: row.originalOrder && onSelectOrder ? 'pointer' : 'default' }}
                onClick={() => {
                  if (row.originalOrder && onSelectOrder) {
                    onSelectOrder(row.originalOrder);
                  }
                }}
              >
                {/* Slip ID */}
                <td>
                  <button
                    className={styles.slipCodeBtn}
                    onClick={(e) => handleCopyId(row.id, e)}
                    title="Click to copy slip ID"
                  >
                    <span>{row.id}</span>
                    {copiedId === row.id ? (
                      <Check size={10} className={styles.copiedIcon} />
                    ) : (
                      <Copy size={9} className={styles.copyIcon} />
                    )}
                  </button>
                </td>

                {/* Target Dispatch */}
                <td>
                  <div className={styles.cellTime}>
                    <Clock size={11} className={styles.timeIcon} />
                    <span className={styles.timeVal}>{row.dispatchTime}</span>
                  </div>
                  <span className={styles.timeCountdown}>{row.timeRemaining}</span>
                </td>

                {/* Host Contact */}
                <td>
                  <div className={styles.hostCell}>
                    <span className={styles.hostName}>{row.hostName}</span>
                    <span className={styles.hostPhone}>{row.phone}</span>
                  </div>
                </td>

                {/* Banqueting Venue */}
                <td>
                  <div className={styles.venueCell}>
                    <span className={styles.venueTitle}>{row.venue}</span>
                    <span className={styles.venuePostcode}>{row.postcode}</span>
                  </div>
                </td>

                {/* Covers & Dietary */}
                <td>
                  <div className={styles.coversDietaryCell}>
                    <span className={styles.coversPill}>{row.covers}p</span>
                    {renderDietarySeal(row.dietaryType, row.dietaryLabel)}
                  </div>
                </td>

                {/* Menu Manifest & Handis */}
                <td>
                  <div className={styles.manifestCell}>
                    <span className={styles.manifestText}>{row.manifest}</span>
                    <span className={styles.handiBadge}>{row.handiCount}</span>
                  </div>
                </td>

                {/* Status */}
                <td style={{ textAlign: 'center' }}>{getStagePill(row.stageStatus)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 5. Master Summary Footer */}
      <div className={styles.sheetFooter}>
        <div className={styles.footerLeft}>
          <span className={styles.footerTally}>
            Showing {filteredRows.length} of {rows.length} Active Production Slips
          </span>
          <span className={styles.footerDot}>•</span>
          <span className={styles.footerPax}>Sum: {totalPax} Covers Cooking Tonight</span>
          <span className={styles.footerDot}>•</span>
          <span className={styles.footerHalalAudit}>
            <ShieldCheck size={12} className={styles.auditIcon} />
            British Halal UK-88219 Certified
          </span>
        </div>

        <div className={styles.footerRight}>
          <button className={styles.bulkBtn} onClick={() => alert('Broadcasting shift briefing...')}>
            Broadcast Shift Briefing
          </button>
          <button className={styles.bulkPrintBtn} onClick={() => window.print()}>
            Print All KOT Slips
          </button>
        </div>
      </div>
    </div>
  );
};
