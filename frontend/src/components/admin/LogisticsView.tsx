import { Truck, MapPin, Clock, Navigation } from 'lucide-react';
import { EnterpriseOrder } from '../../types/index.ts';
import styles from './LogisticsView.module.css';

export interface LogisticsViewProps {
  orders?: EnterpriseOrder[];
}

export const LogisticsView: React.FC<LogisticsViewProps> = ({ orders = [] }) => {
  const routes = [
    {
      name: 'North-West Corridor (Brent & Harrow)',
      zone: 'Zone 1 (Priority Dispatch)',
      postcodes: ['HA9 Wembley', 'HA1 Harrow', 'HA3 Kenton', 'HA8 Edgware', 'NW10 Park Royal'],
      notes: 'Peak catering delivery corridor. Standard transit: 25–35 mins. Chafing dishes set up with warm gel burners on arrival.',
      leadTime: '48h Standard',
      deliveryFee: 'Complimentary Delivery',
    },
    {
      name: 'West London Corridor (Ealing & Hounslow)',
      zone: 'Zone 2',
      postcodes: ['UB1 Southall', 'UB2 Norwood Green', 'TW3 Hounslow', 'TW4 Cranford', 'W5 Ealing'],
      notes: 'High concentration of banquet halls. Ensure dedicated thermal transport bags for hot naan packs.',
      leadTime: '48h Standard',
      deliveryFee: 'Complimentary Delivery',
    },
    {
      name: 'Berkshire & Outer West (Slough & Windsor)',
      zone: 'Zone 3',
      postcodes: ['SL1 Slough Central', 'SL2 Burnham', 'SL3 Langley', 'UB8 Uxbridge'],
      notes: 'M4 corridor dispatch. Orders over £200 qualify for free delivery. Chafing warmers collection scheduled for next day.',
      leadTime: '48h Standard',
      deliveryFee: 'Complimentary on £200+',
    },
    {
      name: 'Hertfordshire Border (Watford & Barnet)',
      zone: 'Zone 4',
      postcodes: ['WD17 Watford', 'WD18 Central', 'EN5 Barnet', 'EN4 Hadley Wood'],
      notes: 'Requires dispatch 60 mins before guest serving time to account for M25/A41 traffic.',
      leadTime: '72h Notice',
      deliveryFee: '£25 Surcharge (Subsidised)',
    },
    {
      name: 'Central London, Mayfair & Docklands',
      zone: 'Zone 5 (VIP Transport)',
      postcodes: ['W1K Mayfair', 'SW1 Knightsbridge', 'E14 Canary Wharf', 'EC1 City of London'],
      notes: 'Direct chauffeur courier delivery. Food loaded hot in sealed commercial Cambro thermal units with white-glove setup.',
      leadTime: '48h Standard',
      deliveryFee: 'Complimentary on £250+',
    },
  ];

  return (
    <div className={styles.logisticsContainer}>
      <div className={styles.headerArea}>
        <div className={styles.titleArea}>
          <div className={styles.superTitle}>
            <Navigation size={15} className={styles.goldNav} />
            <span>HEATED FLEET LOGISTICS</span>
          </div>
          <h2 className={styles.mainTitle}>London Postcode Delivery & Route Matrix</h2>
          <p className={styles.desc}>
            Operating fleet zones, thermal Cambro transport routing, and chauffeur dispatch guidelines across Greater London and Berkshire.
          </p>
        </div>
      </div>

      <div className={styles.grid}>
        {routes.map((r, i) => {
          const matchingOrders = orders.filter((o) => {
            const dest = (o.event?.deliveryAddress || o.customer?.postcode || '').toUpperCase();
            return r.postcodes.some((p) => dest.includes(p.split(' ')[0]));
          });

          return (
            <article key={i} className={styles.routeCard}>
              <div className={styles.routeTop}>
                <div className={styles.routeNameWrap}>
                  <Truck size={16} className={styles.truckIcon} />
                  <h4 className={styles.routeName}>{r.name}</h4>
                </div>
                <span className={styles.zoneBadge}>
                  {matchingOrders.length > 0 ? `${matchingOrders.length} Active • ` : ''}
                  {r.zone}
                </span>
              </div>

            <div className={styles.postcodePills}>
              {r.postcodes.map((pc, idx) => (
                <span key={idx} className={styles.pcPill}>
                  <MapPin size={10} className={styles.pinIcon} />
                  <span>{pc}</span>
                </span>
              ))}
            </div>

            <p className={styles.routeNotes}>{r.notes}</p>

            <div className={styles.statusRow}>
              <div className={styles.leadTime}>
                <Clock size={12} />
                <span>Lead: {r.leadTime}</span>
              </div>
              <span className={styles.feeBadge}>{r.deliveryFee}</span>
            </div>
          </article>
        );
      })}
      </div>
    </div>
  );
};
