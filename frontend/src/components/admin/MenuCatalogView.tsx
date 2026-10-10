import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Leaf,
  Award,
  Plus,
  Sliders,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Sparkles,
  Search,
  Share2,
  Copy,
  Check,
  X,
  Wheat,
} from 'lucide-react';
import { MenuItem } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import styles from './MenuCatalogView.module.css';

interface MenuCatalogViewProps {
  items: MenuItem[];
  onMenuUpdated?: () => void;
  onOpenConfigurator?: () => void;
}

interface DishFormData {
  name: string;
  category: string;
  trayPrice: number;
  perPersonPrice: number;
  trayServes: number;
  description: string;
  isHalal: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  available: boolean;
}

const DEFAULT_FORM: DishFormData = {
  name: '',
  category: 'Starters',
  trayPrice: 55,
  perPersonPrice: 7.5,
  trayServes: 10,
  description: '',
  isHalal: true,
  isVegetarian: false,
  isVegan: false,
  isGlutenFree: false,
  available: true,
};

export const MenuCatalogView: React.FC<MenuCatalogViewProps> = ({
  items,
  onMenuUpdated,
  onOpenConfigurator,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [stockFilter, setStockFilter] = useState<'all' | 'available' | 'soldout'>('all');

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState<DishFormData>(DEFAULT_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Fancy Menu Card Modal state
  const [isFancyCardModalOpen, setIsFancyCardModalOpen] = useState(false);
  const [cardCopied, setCardCopied] = useState(false);

  const categories = ['All', 'Starters', 'Mains', 'Rice & Biryani', 'Breads', 'Desserts'];

  // Filtered menu items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Category match
      if (selectedCategory !== 'All') {
        const itemCat = item.category?.toLowerCase() || '';
        const targetCat = selectedCategory.toLowerCase();
        if (targetCat === 'rice & biryani') {
          if (!itemCat.includes('biryani') && !itemCat.includes('rice')) return false;
        } else if (!itemCat.includes(targetCat)) {
          return false;
        }
      }

      // Stock status match
      const isAvailable = item.available !== false;
      if (stockFilter === 'available' && !isAvailable) return false;
      if (stockFilter === 'soldout' && isAvailable) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesDesc = (item.description || '').toLowerCase().includes(q);
        if (!matchesName && !matchesDesc) return false;
      }

      return true;
    });
  }, [items, selectedCategory, stockFilter, searchQuery]);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData(DEFAULT_FORM);
    setIsEditModalOpen(true);
  };

  const handleOpenEditModal = (item: MenuItem) => {
    setEditingItem(item);
    const dietary = item.dietary || [];
    setFormData({
      name: item.name,
      category: item.category || 'Starters',
      trayPrice: item.trayPrice || item.unitPrice || 50,
      perPersonPrice: item.perPersonPrice || 7.5,
      trayServes: item.trayServes || item.servesGuests || 10,
      description: item.description || '',
      isHalal: item.isHalal ?? dietary.includes('Halal'),
      isVegetarian: item.isVegetarian ?? dietary.includes('Vegetarian'),
      isVegan: item.isVegan ?? dietary.includes('Vegan'),
      isGlutenFree: item.isGlutenFree ?? dietary.includes('Gluten-Free'),
      available: item.available !== false,
    });
    setIsEditModalOpen(true);
  };

  const handleToggleStock = async (item: MenuItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = !(item.available !== false);
    try {
      await api.updateMenuItem(item.id, { available: newStatus });
      onMenuUpdated?.();
    } catch (err) {
      console.error('Failed to toggle stock status:', err);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await api.deleteMenuItem(itemId);
      setDeleteConfirmId(null);
      onMenuUpdated?.();
    } catch (err) {
      console.error('Failed to delete menu item:', err);
    }
  };

  const handleSaveDish = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const dietaryArray: string[] = [];
      if (formData.isHalal) dietaryArray.push('Halal');
      if (formData.isVegetarian) dietaryArray.push('Vegetarian');
      if (!formData.isVegetarian) dietaryArray.push('Non-Veg');
      if (formData.isVegan) dietaryArray.push('Vegan');
      if (formData.isGlutenFree) dietaryArray.push('Gluten-Free');

      const payload = {
        name: formData.name,
        category: formData.category,
        description: formData.description,
        trayPrice: Number(formData.trayPrice),
        perPersonPrice: Number(formData.perPersonPrice),
        unitPrice: Number(formData.trayPrice),
        trayServes: Number(formData.trayServes),
        servesGuests: Number(formData.trayServes),
        dietary: dietaryArray,
        isHalal: formData.isHalal,
        isVegetarian: formData.isVegetarian,
        isVegan: formData.isVegan,
        isGlutenFree: formData.isGlutenFree,
        available: formData.available,
      };

      if (editingItem) {
        await api.updateMenuItem(editingItem.id, payload);
      } else {
        await api.createMenuItem(payload);
      }

      setIsEditModalOpen(false);
      onMenuUpdated?.();
    } catch (err) {
      console.error('Failed to save menu item:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Generate fancy WhatsApp copyable card
  const generateWhatsAppCard = () => {
    const starters = items.filter((i) => i.category === 'Starters').slice(0, 3);
    const mains = items.filter((i) => i.category === 'Mains').slice(0, 3);
    const rice = items.filter((i) => (i.category || '').includes('Biryani') || (i.category || '').includes('Rice')).slice(0, 2);
    const desserts = items.filter((i) => i.category === 'Desserts').slice(0, 2);

    return `✨ *DIL SE CULINARY OPERATIONS • ROYAL FEAST MENU* ✨
🏛️ _Authentic Indian Feast • London Hub NW10_
🛡️ _100% British Halal Certified & Pure-Veg Compliant_
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌟 *ROYAL BANQUET SELECTIONS*

🍢 *APPETISERS & STARTERS*
${starters.map((s) => `  • *${s.name}* (Tray: £${(s.trayPrice || s.unitPrice).toFixed(2)}) — Feeds 10`).join('\n')}

🥘 *HERITAGE MAINS & CURRIES*
${mains.map((m) => `  • *${m.name}* (Tray: £${(m.trayPrice || m.unitPrice).toFixed(2)}) — Feeds 10`).join('\n')}

🍚 *DUM BIRYANI & BASMATI RICE*
${rice.map((r) => `  • *${r.name}* (Tray: £${(r.trayPrice || r.unitPrice).toFixed(2)}) — Feeds 10`).join('\n')}

🍮 *DESSERTS & SHAHI SWEETS*
${desserts.map((d) => `  • *${d.name}* (Tray: £${(d.trayPrice || d.unitPrice).toFixed(2)}) — Feeds 10`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 *PARTY TRAY SPECIFICATIONS*
• Each Large Chafing Tray serves 10 generous covers.
• Insulated thermoboxes provided for 4-hour hot holding.
• Delivery across all London Postcodes with heated dispatch.

📞 *To book or customise your tray banquet:*
WhatsApp: +44 20 8965 4321
Online Tray Builder: https://dilse.co.uk/configurator`;
  };

  const handleCopyFancyCard = () => {
    navigator.clipboard.writeText(generateWhatsAppCard());
    setCardCopied(true);
    setTimeout(() => setCardCopied(false), 3000);
  };

  return (
    <div className={styles.catalogContainer}>
      {/* Executive Header Area */}
      <div className={styles.headerArea}>
        <div className={styles.headerContent}>
          <div className={styles.titleArea}>
            <div className={styles.superTitle}>
              <Award size={15} className={styles.goldAward} />
              <span>HERITAGE RECIPES & BANQUET SPECIFICATIONS</span>
            </div>
            <h2 className={styles.mainTitle}>Royal Menu & Tray Inventory Management</h2>
            <p className={styles.desc}>
              Manage banquet dishes, chafing tray pricing, per-head buffet yields, British Halal / Pure-Veg declarations, and real-time live stock availability.
            </p>
          </div>

          <div className={styles.headerActions}>
            {onOpenConfigurator && (
              <button
                className={styles.configuratorActionBtn}
                onClick={onOpenConfigurator}
                title="Launch Interactive Customer Tray Configurator"
              >
                <Sliders size={14} className={styles.actionIcon} />
                <span>Tray Configurator</span>
              </button>
            )}

            <button
              className={styles.shareMenuBtn}
              onClick={() => setIsFancyCardModalOpen(true)}
              title="Generate and copy fancy WhatsApp Royal Menu card"
            >
              <Share2 size={14} className={styles.actionIcon} />
              <span>Fancy Menu Card</span>
            </button>

            <button
              className={styles.addDishBtn}
              onClick={handleOpenAddModal}
              title="Add a new heritage recipe or tray to catalog"
            >
              <Plus size={15} />
              <span>+ Add New Dish</span>
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className={styles.controlsBar}>
          <div className={styles.searchBox}>
            <Search size={14} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search dish by name, marinade, ingredients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
            {searchQuery && (
              <button
                className={styles.clearSearchBtn}
                onClick={() => setSearchQuery('')}
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className={styles.categoryPills}>
            {categories.map((cat) => (
              <button
                key={cat}
                className={`${styles.categoryPill} ${
                  selectedCategory === cat ? styles.categoryPillActive : ''
                }`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className={styles.stockSelector}>
            <button
              className={`${styles.stockBtn} ${stockFilter === 'all' ? styles.stockBtnActive : ''}`}
              onClick={() => setStockFilter('all')}
            >
              All ({items.length})
            </button>
            <button
              className={`${styles.stockBtn} ${stockFilter === 'available' ? styles.stockBtnActive : ''}`}
              onClick={() => setStockFilter('available')}
            >
              In Stock ({items.filter((i) => i.available !== false).length})
            </button>
            <button
              className={`${styles.stockBtn} ${stockFilter === 'soldout' ? styles.stockBtnActive : ''}`}
              onClick={() => setStockFilter('soldout')}
            >
              Sold Out ({items.filter((i) => i.available === false).length})
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Dishes */}
      <div className={styles.grid}>
        {filteredItems.map((item) => {
          const isAvailable = item.available !== false;
          const trayPrice = item.trayPrice || item.unitPrice || 0;
          const serves = item.trayServes || item.servesGuests || 10;
          const perPersonPrice = item.perPersonPrice || (trayPrice / serves);

          return (
            <article
              key={item.id}
              className={`${styles.itemCard} ${!isAvailable ? styles.itemCardSoldOut : ''}`}
            >
              <div className={styles.itemTop}>
                <div className={styles.titleWithCategory}>
                  <span className={styles.categoryBadge}>{item.category || 'Course'}</span>
                  <h4 className={styles.itemName}>{item.name}</h4>
                </div>

                <div className={styles.stockPill}>
                  {isAvailable ? (
                    <span className={styles.inStockBadge}>
                      <CheckCircle size={10} /> In Stock
                    </span>
                  ) : (
                    <span className={styles.soldOutBadge}>
                      <XCircle size={10} /> Sold Out
                    </span>
                  )}
                </div>
              </div>

              {/* Dietary Seals */}
              <div className={styles.sealsRow}>
                {item.isHalal && (
                  <span className={styles.sealHalal}>
                    <ShieldCheck size={11} />
                    <span>British Halal</span>
                  </span>
                )}
                {item.isVegetarian && (
                  <span className={styles.sealVeg}>
                    <Leaf size={11} />
                    <span>Pure Veg</span>
                  </span>
                )}
                {item.isVegan && (
                  <span className={styles.sealVegan}>
                    <Sparkles size={11} />
                    <span>Vegan</span>
                  </span>
                )}
                {item.isGlutenFree && (
                  <span className={styles.sealGlutenFree}>
                    <Wheat size={11} />
                    <span>Gluten Free</span>
                  </span>
                )}
              </div>

              <p className={styles.itemDesc}>{item.description}</p>

              {/* Portion & Pricing breakdown */}
              <div className={styles.pricingBreakdown}>
                <div className={styles.priceCol}>
                  <span className={styles.priceLbl}>Large Party Tray</span>
                  <span className={styles.priceVal}>£{trayPrice.toFixed(2)}</span>
                </div>
                <div className={styles.servesBadge}>
                  Feeds ~{serves} covers
                </div>
                <div className={styles.pricePerPersonCol}>
                  <span className={styles.priceLbl}>Per Head Rate</span>
                  <span className={styles.priceSubVal}>£{perPersonPrice.toFixed(2)} / head</span>
                </div>
              </div>

              {/* Admin Actions Bar */}
              <div className={styles.adminActionBar}>
                <button
                  className={`${styles.stockToggleBtn} ${
                    isAvailable ? styles.stockToggleAvailable : styles.stockToggleSoldOut
                  }`}
                  onClick={(e) => handleToggleStock(item, e)}
                  title={isAvailable ? 'Mark as Sold Out' : 'Mark as In Stock'}
                >
                  {isAvailable ? 'Mark Sold Out' : 'Mark In Stock'}
                </button>

                <div className={styles.cardActionsRight}>
                  <button
                    className={styles.editBtn}
                    onClick={() => handleOpenEditModal(item)}
                    title="Edit dish specifications and pricing"
                  >
                    <Edit2 size={13} />
                    <span>Edit</span>
                  </button>

                  {deleteConfirmId === item.id ? (
                    <div className={styles.deleteConfirmGroup}>
                      <button
                        className={styles.confirmDeleteBtn}
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        Confirm
                      </button>
                      <button
                        className={styles.cancelDeleteBtn}
                        onClick={() => setDeleteConfirmId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      className={styles.deleteBtn}
                      onClick={() => setDeleteConfirmId(item.id)}
                      title="Remove dish from menu"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className={styles.emptyState}>
          <Sparkles size={32} className={styles.emptyIcon} />
          <h3>No matching recipes found</h3>
          <p>Try searching for a different dish name or clear the selected filters.</p>
          <button
            className={styles.resetFiltersBtn}
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
              setStockFilter('all');
            }}
          >
            Reset All Filters
          </button>
        </div>
      )}

      {/* Add / Edit Dish Modal */}
      {isEditModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setIsEditModalOpen(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderTitle}>
                <Sparkles size={16} className={styles.goldAward} />
                <h3>{editingItem ? 'Edit Culinary Recipe' : 'Add New Heritage Recipe'}</h3>
              </div>
              <button
                className={styles.closeModalBtn}
                onClick={() => setIsEditModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveDish} className={styles.dishForm}>
              <div className={styles.formGrid}>
                <div className={styles.formGroupFull}>
                  <label>Dish Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lucknowi Dum Biryani (Lamb)"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Course Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="Starters">Starters (Appetisers)</option>
                    <option value="Mains">Mains (Curries & Gravies)</option>
                    <option value="Rice & Biryani">Rice & Dum Biryani</option>
                    <option value="Breads">Artisan Breads (Naan/Roti)</option>
                    <option value="Desserts">Desserts (Mithai)</option>
                    <option value="Beverages">Beverages & Lassi</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Serves Per Tray (Covers)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={formData.trayServes}
                    onChange={(e) =>
                      setFormData({ ...formData, trayServes: parseInt(e.target.value) || 10 })
                    }
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Party Tray Unit Price (£)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    required
                    value={formData.trayPrice}
                    onChange={(e) =>
                      setFormData({ ...formData, trayPrice: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Per Person Rate (£ / head)</label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    required
                    value={formData.perPersonPrice}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        perPersonPrice: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div className={styles.formGroupFull}>
                  <label>Culinary Description & Ingredients</label>
                  <textarea
                    rows={3}
                    placeholder="Describe the marinade, slow-cooking technique, and key ingredients..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                {/* Dietary Declarations */}
                <div className={styles.dietaryCheckboxes}>
                  <label className={styles.checkLabel}>
                    <input
                      type="checkbox"
                      checked={formData.isHalal}
                      onChange={(e) => setFormData({ ...formData, isHalal: e.target.checked })}
                    />
                    <span>British Halal Certified (HMC audited)</span>
                  </label>

                  <label className={styles.checkLabel}>
                    <input
                      type="checkbox"
                      checked={formData.isVegetarian}
                      onChange={(e) =>
                        setFormData({ ...formData, isVegetarian: e.target.checked })
                      }
                    />
                    <span>Pure Vegetarian</span>
                  </label>

                  <label className={styles.checkLabel}>
                    <input
                      type="checkbox"
                      checked={formData.isVegan}
                      onChange={(e) => setFormData({ ...formData, isVegan: e.target.checked })}
                    />
                    <span>Vegan</span>
                  </label>

                  <label className={styles.checkLabel}>
                    <input
                      type="checkbox"
                      checked={formData.isGlutenFree}
                      onChange={(e) =>
                        setFormData({ ...formData, isGlutenFree: e.target.checked })
                      }
                    />
                    <span>Gluten Free</span>
                  </label>

                  <label className={styles.checkLabel}>
                    <input
                      type="checkbox"
                      checked={formData.available}
                      onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                    />
                    <span>In Stock / Ready for Dispatch</span>
                  </label>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.cancelFormBtn}
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className={styles.saveDishSubmitBtn}
                >
                  {isSaving ? 'Saving...' : editingItem ? 'Save Modifications' : 'Create Recipe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fancy Menu Card Preview & Copy Modal */}
      {isFancyCardModalOpen && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setIsFancyCardModalOpen(false)}
        >
          <div className={styles.fancyModalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderTitle}>
                <Sparkles size={16} className={styles.goldAward} />
                <h3>Royal Banquet Card & WhatsApp Formatter</h3>
              </div>
              <button
                className={styles.closeModalBtn}
                onClick={() => setIsFancyCardModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className={styles.fancyCardBody}>
              <div className={styles.fancyVisualCard}>
                <div className={styles.cardGoldTrim}>
                  <div className={styles.cardHeaderBox}>
                    <div className={styles.crestRow}>
                      <span className={styles.crestDot} />
                      <span className={styles.crestText}>DIL SE CULINARY OPERATIONS</span>
                      <span className={styles.crestDot} />
                    </div>
                    <h2 className={styles.cardRoyalTitle}>Royal Feast Menu Card</h2>
                    <p className={styles.cardSubTitle}>
                      Michelin-Grade Execution • 100% British Halal Certified • NW10 Hub
                    </p>
                  </div>

                  <div className={styles.cardMenuGrid}>
                    <div className={styles.cardCourseSec}>
                      <span className={styles.cardCourseTitle}>🍢 STARTERS</span>
                      <ul>
                        {items
                          .filter((i) => i.category === 'Starters')
                          .slice(0, 3)
                          .map((s) => (
                            <li key={s.id}>
                              <strong>{s.name}</strong> — £
                              {(s.trayPrice || s.unitPrice).toFixed(2)} / tray
                            </li>
                          ))}
                      </ul>
                    </div>

                    <div className={styles.cardCourseSec}>
                      <span className={styles.cardCourseTitle}>🥘 ROYAL MAINS</span>
                      <ul>
                        {items
                          .filter((i) => i.category === 'Mains')
                          .slice(0, 3)
                          .map((m) => (
                            <li key={m.id}>
                              <strong>{m.name}</strong> — £
                              {(m.trayPrice || m.unitPrice).toFixed(2)} / tray
                            </li>
                          ))}
                      </ul>
                    </div>

                    <div className={styles.cardCourseSec}>
                      <span className={styles.cardCourseTitle}>🍚 DUM BIRYANI & RICE</span>
                      <ul>
                        {items
                          .filter(
                            (i) =>
                              (i.category || '').includes('Biryani') ||
                              (i.category || '').includes('Rice')
                          )
                          .slice(0, 2)
                          .map((r) => (
                            <li key={r.id}>
                              <strong>{r.name}</strong> — £
                              {(r.trayPrice || r.unitPrice).toFixed(2)} / tray
                            </li>
                          ))}
                      </ul>
                    </div>

                    <div className={styles.cardCourseSec}>
                      <span className={styles.cardCourseTitle}>🍮 SHAHI DESSERTS</span>
                      <ul>
                        {items
                          .filter((i) => i.category === 'Desserts')
                          .slice(0, 2)
                          .map((d) => (
                            <li key={d.id}>
                              <strong>{d.name}</strong> — £
                              {(d.trayPrice || d.unitPrice).toFixed(2)} / tray
                            </li>
                          ))}
                      </ul>
                    </div>
                  </div>

                  <div className={styles.cardFooterNotes}>
                    <span>Each large chafing tray serves 10 guests. Insulated 4hr thermal box included.</span>
                  </div>
                </div>
              </div>

              {/* Copy actions */}
              <div className={styles.fancyCopyBox}>
                <div className={styles.copyHeader}>
                  <h4>WhatsApp Formatted Text</h4>
                  <p>Ready to copy and paste directly into WhatsApp customer chat:</p>
                </div>
                <pre className={styles.whatsAppPreviewCode}>{generateWhatsAppCard()}</pre>

                <button
                  className={`${styles.copyCardActionBtn} ${
                    cardCopied ? styles.copyCardSuccess : ''
                  }`}
                  onClick={handleCopyFancyCard}
                >
                  {cardCopied ? (
                    <>
                      <Check size={15} />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={15} />
                      <span>Copy WhatsApp Menu Card</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
