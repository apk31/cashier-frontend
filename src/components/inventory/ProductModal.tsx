import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Save } from 'lucide-react';
import styles from './ProductModal.module.css';
import { productsApi } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import type { Category, Product, Variant } from '../../types';

interface ProductModalProps {
  onClose: () => void;
  categories: Category[];
  productToEdit?: Product;
  variantToEdit?: Variant;
}

export default function ProductModal({ onClose, categories, productToEdit, variantToEdit }: ProductModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const isEdit = !!productToEdit;

  // ── Role checks ─────────────────────────────────────────────────────────────
  // ADMIN and MANAGER can edit all fields.
  // SKU and Barcode stay locked in edit mode regardless of role because they
  // are unique keys — changing them would silently break barcode lookups and
  // existing transaction history references.
  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  // In edit mode, mutable fields are unlocked for ADMIN/MANAGER
  const metaLocked = isEdit && !canEdit;     // name, variant name, has_open_price
  const priceLocked = isEdit && !canEdit;    // selling price
  const stockLocked = isEdit && !canEdit;    // stock (shown as absolute; saved as delta)
  const skuLocked = isEdit;                  // always locked in edit — it's a unique key
  const barcodeLocked = isEdit;              // always locked in edit

  // ── Product fields ───────────────────────────────────────────────────────────
  const [name, setName] = useState(productToEdit?.name || '');
  const [categoryId, setCategoryId] = useState(
    productToEdit?.category_id || (categories[0]?.id || '')
  );

  // ── Variant fields ───────────────────────────────────────────────────────────
  const targetVariant = variantToEdit || productToEdit?.variants?.[0];

  const [sku, setSku] = useState(targetVariant?.sku || '');
  const [barcode, setBarcode] = useState(targetVariant?.barcode || '');
  const [variantName, setVariantName] = useState(targetVariant?.name || '');
  const [price, setPrice] = useState(targetVariant ? parseFloat(targetVariant.price) : 0);
  const [basePrice, setBasePrice] = useState(0);
  const [stock, setStock] = useState(targetVariant?.stock ?? 0);
  const [hasOpenPrice, setHasOpenPrice] = useState(targetVariant?.has_open_price || false);

  // ── Save mutation ────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!isEdit) {
        // ── CREATE ────────────────────────────────────────────────────────────
        return productsApi.create({
          name,
          category_id: categoryId,
          variants: [{
            name: variantName || null,
            sku,
            barcode: barcode || null,
            price,
            stock,
            base_price: basePrice,
            has_open_price: hasOpenPrice,
          }],
        });
      }

      // ── EDIT ──────────────────────────────────────────────────────────────
      const ops: Promise<unknown>[] = [];

      // 1. Product name / category
      if (productToEdit && (productToEdit.name !== name || productToEdit.category_id !== categoryId)) {
        ops.push(productsApi.update(productToEdit.id, { name, category_id: categoryId }));
      }

      if (targetVariant) {
        // 2. Price (has its own audit-logged endpoint)
        if (parseFloat(targetVariant.price) !== price) {
          ops.push(productsApi.updatePrice(targetVariant.id, price));
        }

        // 3. Stock (delta-based, keeps FIFO batches correct)
        if (targetVariant.stock !== stock) {
          const diff = stock - targetVariant.stock;
          ops.push(productsApi.updateStock(targetVariant.id, {
            quantity: diff,
            base_price: diff > 0 ? basePrice : 0,
            reason: 'ADJUSTMENT',
          }));
        }

        // 4. Variant metadata: name and has_open_price
        // Only call if something actually changed to avoid unnecessary requests
        const nameChanged = (targetVariant.name ?? '') !== (variantName ?? '');
        const openPriceChanged = targetVariant.has_open_price !== hasOpenPrice;
        if (nameChanged || openPriceChanged) {
          ops.push(productsApi.updateVariantMeta(targetVariant.id, {
            name: variantName || null,
            has_open_price: hasOpenPrice,
          }));
        }
      }

      // Run all updates in parallel
      await Promise.all(ops);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(isEdit ? 'Product updated' : 'Product created');
      onClose();
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      toast.error(axiosErr.response?.data?.error || 'Failed to save product');
    },
  });

  // ── Derived UI helpers ───────────────────────────────────────────────────────
  // Show base price when: creating fresh, or adding new stock in edit mode
  const showBasePrice = !isEdit || (isEdit && stock > (targetVariant?.stock ?? 0));

  const isSaveDisabled = saveMutation.isPending || !name.trim() || (!isEdit && !sku.trim());

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className={styles.header}>
          <h2>{isEdit ? 'Edit Product' : 'Add New Product'}</h2>
          <button onClick={onClose} className={styles.closeBtn} disabled={saveMutation.isPending}>
            <X size={20} />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className={styles.content}>

          {/* Product name */}
          <div className={styles.formGroup}>
            <label>Product Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Espresso"
              className={styles.input}
              disabled={metaLocked}
            />
          </div>

          {/* Category */}
          <div className={styles.formGroup}>
            <label>Category</label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className={styles.input}
              disabled={metaLocked}
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <hr className={styles.divider} />
          <h3>Variant Details</h3>

          {/* ── 2-column grid for variant fields ────────────────────────── */}
          <div className={styles.gridVariant}>

            {/* SKU — always locked in edit (unique key) */}
            <div className={styles.formGroup}>
              <label>SKU *</label>
              <input
                type="text"
                value={sku}
                onChange={e => setSku(e.target.value)}
                disabled={skuLocked}
                placeholder="e.g. LATTE-01"
                className={styles.input}
                required
              />
              {skuLocked && <span className={styles.stockHint}>SKU cannot change after creation</span>}
            </div>

            {/* Barcode — always locked in edit */}
            <div className={styles.formGroup}>
              <label>Barcode</label>
              <input
                type="text"
                value={barcode}
                onChange={e => setBarcode(e.target.value)}
                disabled={barcodeLocked}
                placeholder="Optional"
                className={styles.input}
              />
              {barcodeLocked && <span className={styles.stockHint}>Cannot change after creation</span>}
            </div>

            {/* Variant name — editable for ADMIN/MANAGER */}
            <div className={styles.formGroup}>
              <label>Variant Name</label>
              <input
                type="text"
                value={variantName}
                onChange={e => setVariantName(e.target.value)}
                disabled={metaLocked}
                placeholder="e.g. Regular, Large"
                className={styles.input}
              />
            </div>

            {/* Selling price — editable for ADMIN/MANAGER (creates price-log) */}
            <div className={styles.formGroup}>
              <label>Selling Price (Rp) *</label>
              <input
                type="number"
                min="0"
                value={price}
                onChange={e => setPrice(Number(e.target.value))}
                className={styles.input}
                disabled={priceLocked || hasOpenPrice}
                required
              />
              {isEdit && !priceLocked && (
                <span className={styles.stockHint}>Changing price creates an audit log entry</span>
              )}
            </div>

            {/* Stock — editable for ADMIN/MANAGER (saved as delta) */}
            <div className={styles.formGroup}>
              <label>
                {isEdit ? 'Stock (absolute target)' : 'Initial Stock'}
              </label>
              <input
                type="number"
                min="0"
                value={stock}
                onChange={e => setStock(Number(e.target.value))}
                className={styles.input}
                disabled={stockLocked}
              />
              {isEdit && !stockLocked && targetVariant && (
                <span className={styles.stockHint}>
                  Current: {targetVariant.stock} → delta will be{' '}
                  {stock - targetVariant.stock >= 0 ? '+' : ''}{stock - targetVariant.stock}
                </span>
              )}
            </div>

            {/* Base cost — shown when adding new stock */}
            {showBasePrice && (
              <div className={styles.formGroup}>
                <label>Base Cost / HPP per unit (Rp)</label>
                <input
                  type="number"
                  min="0"
                  value={basePrice}
                  onChange={e => setBasePrice(Number(e.target.value))}
                  className={styles.input}
                  placeholder="Purchase cost for FIFO"
                  disabled={stockLocked}
                />
              </div>
            )}

            {/* Open price toggle — editable for ADMIN/MANAGER */}
            <div className={styles.checkboxGroup}>
              <input
                type="checkbox"
                id="openPrice"
                checked={hasOpenPrice}
                onChange={e => setHasOpenPrice(e.target.checked)}
                disabled={metaLocked}
              />
              <label htmlFor="openPrice">
                Allow Cashier to Enter Price (Open Price)
                {hasOpenPrice && (
                  <span style={{ color: 'var(--color-warning)', fontSize: '0.75rem', marginLeft: 8 }}>
                    — selling price field above is ignored
                  </span>
                )}
              </label>
            </div>

          </div>
          {/* end gridVariant */}

          {/* Permission notice for read-only view */}
          {isEdit && !canEdit && (
            <div style={{
              background: 'var(--color-warning-bg)',
              color: 'var(--color-warning)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              fontSize: '0.8125rem',
              fontWeight: 500,
            }}>
              ℹ️ Only Admin or Manager can edit product details.
            </div>
          )}

        </div>
        {/* end content */}

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={saveMutation.isPending}>
            Cancel
          </button>
          <button
            className={styles.saveBtn}
            onClick={() => saveMutation.mutate()}
            disabled={isSaveDisabled || (isEdit && !canEdit)}
          >
            {saveMutation.isPending
              ? 'Saving…'
              : <><Save size={16} /> {isEdit ? 'Save Changes' : 'Create Product'}</>}
          </button>
        </div>

      </div>
    </div>
  );
}