import { ShieldCheck, Leaf, Award } from 'lucide-react';
import { MenuItem } from '../../types/index.ts';
import styles from './MenuCatalogView.module.css';

interface MenuCatalogViewProps {
  items: MenuItem[];
}

export const MenuCatalogView: React.FC<MenuCatalogViewProps> = ({ items }) => {
  return (
    <div className={styles.catalogContainer}>
      <div className={styles.headerArea}>
        <div className={styles.titleArea}>
          <div className={styles.superTitle}>
            <Award size={15} className={styles.goldAward} />
            <span>HERITAGE RECIPES & BANQUET SPECIFICATIONS</span>
          </div>
          <h2 className={styles.mainTitle}>Royal Menu & Culinary Specifications Guide</h2>
          <p className={styles.desc}>
            Official portfolio specifications, portion yields, chafing dish allocation, and certified British Halal / Pure-Veg declarations.
          </p>
        </div>
      </div>

      <div className={styles.grid}>
        {items.map((item) => (
          <article key={item.id} className={styles.itemCard}>
            <div className={styles.itemTop}>
              <h4 className={styles.itemName}>{item.name}</h4>
              <div className={styles.sealsRow}>
                {item.isHalal && (
                  <span className={styles.sealHalal}>
                    <ShieldCheck size={12} />
                    <span>British Halal</span>
                  </span>
                )}
                {item.isVegetarian && (
                  <span className={styles.sealVeg}>
                    <Leaf size={12} />
                    <span>Pure Veg</span>
                  </span>
                )}
              </div>
            </div>

            <p className={styles.itemDesc}>{item.description}</p>

            <div className={styles.itemFooter}>
              <div className={styles.priceCol}>
                <span className={styles.priceLbl}>Tray Unit Price</span>
                <span className={styles.priceVal}>£{item.unitPrice.toFixed(2)}</span>
              </div>
              <span className={styles.capTag}>
                Feeds ~{item.servesGuests || 10} covers
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
