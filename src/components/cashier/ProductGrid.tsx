import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import styles from './ProductGrid.module.css';
import { useCartStore } from '../../store/cartStore';
import { productsApi, categoriesApi } from '../../lib/api';
import type { Product, Variant, Category } from '../../types';

export default function ProductGrid() {
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [openPriceItem, setOpenPriceItem] = useState<{ product: Product; variant: Variant } | null>(null);
  const [customPriceInput, setCustomPriceInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const barcodeRef = useRef('');
  const addItem = useCartStore((state) => state.addItem);

  // ── Categories ────────────────────────────────────────────────────────────

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
  });

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].id);
    }
  }, [categories, activeCategory]);

  // ── Products ──────────────────────────────────────────────────────────────

  const { data: productData, isLoading } = useQuery({
    queryKey: ['products', activeCategory, searchQuery],
    queryFn: () => productsApi.list({
      category_id: searchQuery ? undefined : (activeCategory || undefined),
      q: searchQuery || undefined,
      limit: 100,
    }),
    staleTime: 1000 * 30, // 30s cache
  });
  const products = productData?.data ?? [];

  // ── Open price modal focus ────────────────────────────────────────────────

  useEffect(() => {
    if (openPriceItem) inputRef.current?.focus();
  }, [openPriceItem]);

  // ── USB Barcode scanner (keyboard HID) ───────────────────────────────────

  const handleBarcodeScan = useCallback(async (code: string) => {
    if (!code.trim()) return;
    try {
      const variant = await productsApi.byBarcode(code.trim());
      addItem({
        variant_id: variant.id,
        name: `${variant.product.name}${variant.name ? ` (${variant.name})` : ''}`,
        sku: variant.sku,
        price: parseFloat(variant.price),
        has_open_price: variant.has_open_price,
      });
    } catch {
      // not found — could show toast
    }
  }, [addItem]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const handleKey = (e: KeyboardEvent) => {
      // Only capture if focus is NOT in an input/textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      if (e.key === 'Enter') {
        if (barcodeRef.current) handleBarcodeScan(barcodeRef.current);
        barcodeRef.current = '';
      } else if (e.key.length === 1) {
        barcodeRef.current += e.key;
        clearTimeout(timer);
        timer = setTimeout(() => { barcodeRef.current = ''; }, 100);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleBarcodeScan]);

  // ── Cart logic ────────────────────────────────────────────────────────────

  const handleProductClick = (product: Product, variant: Variant) => {
    if (variant.stock <= 0) return;
    if (variant.has_open_price) {
      setOpenPriceItem({ product, variant });
      setCustomPriceInput('');
      return;
    }
    addItem({
      variant_id: variant.id,
      name: `${product.name}${variant.name ? ` (${variant.name})` : ''}`,
      sku: variant.sku,
      price: parseFloat(variant.price),
      has_open_price: false,
    });
  };

  const handleOpenPriceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!openPriceItem || !customPriceInput) return;
    const priceVal = parseInt(customPriceInput.replace(/\D/g, ''), 10);
    if (isNaN(priceVal) || priceVal <= 0) return;
    addItem({
      variant_id: openPriceItem.variant.id,
      name: `${openPriceItem.product.name}${openPriceItem.variant.name ? ` (${openPriceItem.variant.name})` : ''}`,
      sku: openPriceItem.variant.sku,
      price: priceVal,
      has_open_price: true,
    });
    setOpenPriceItem(null);
  };

  return (
    <div className={styles.container}>
      {/* Top Bar: Search & Categories */}
      <div className={styles.header}>
        <input
          type="text"
          placeholder="Search product or scan barcode..."
          className={styles.searchBar}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {!searchQuery && (
          <div className={styles.categoryTabs}>
            {categories.map(c => (
              <button
                key={c.id}
                className={`${styles.tab} ${activeCategory === c.id ? styles.tabActive : ''}`}
                onClick={() => setActiveCategory(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid */}
      <div className={styles.grid}>
        {isLoading && (
          <div className={styles.emptyState}>Loading products...</div>
        )}

        {!isLoading && products.map(product => (
          <div key={product.id} className={styles.productCard}>
            <div className={styles.productInfo}>
              <h3 className={styles.productName}>{product.name}</h3>
            </div>
            <div className={styles.variants}>
              {product.variants.map(variant => (
                <button
                  key={variant.id}
                  className={styles.variantBtn}
                  onClick={() => handleProductClick(product, variant)}
                  disabled={variant.stock <= 0}
                >
                  <span className={styles.variantName}>{variant.name || 'Default'}</span>
                  <span className={styles.variantPrice}>
                    {variant.has_open_price
                      ? '✍ Open Price'
                      : `Rp ${parseFloat(variant.price).toLocaleString('id-ID')}`}
                  </span>
                  {variant.stock <= 5 && (
                    <span className={styles.stockWarning}>Sisa: {variant.stock}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}

        {!isLoading && products.length === 0 && (
          <div className={styles.emptyState}>No products found.</div>
        )}
      </div>

      {/* Open Price Modal */}
      {openPriceItem && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Input Harga Hari Ini</h3>
            <p className={styles.modalSubtitle}>{openPriceItem.product.name}</p>
            <form onSubmit={handleOpenPriceSubmit}>
              <div className={styles.inputWrapper}>
                <span className={styles.currencyPrefix}>Rp</span>
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  value={customPriceInput}
                  onChange={(e) => setCustomPriceInput(e.target.value)}
                  placeholder="0"
                  className={styles.priceInput}
                />
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setOpenPriceItem(null)} className={styles.cancelBtn}>Batal</button>
                <button type="submit" disabled={!customPriceInput} className={styles.submitBtn}>Tambah ke Keranjang</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
