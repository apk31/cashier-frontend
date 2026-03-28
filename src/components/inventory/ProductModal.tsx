import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Save } from 'lucide-react';
import styles from './ProductModal.module.css';
import { productsApi } from '../../lib/api';
import toast from 'react-hot-toast';
import type { Category, Product, Variant } from '../../types';

interface ProductModalProps {
  onClose: () => void;
  categories: Category[];
  productToEdit?: Product; // If provided, edit product. If not, create.
  variantToEdit?: Variant; // If provided alongside product, edit specific variant price/stock
}

export default function ProductModal({ onClose, categories, productToEdit, variantToEdit }: ProductModalProps) {
  const queryClient = useQueryClient();
  const isEdit = !!productToEdit;

  // Product Fields
  const [name, setName] = useState(productToEdit?.name || '');
  const [categoryId, setCategoryId] = useState(productToEdit?.category_id || (categories[0]?.id || ''));

  // Variant Fields (only used for Create or editing a single variant)
  const defaultVariant = productToEdit?.variants?.[0]; // Simplification: handle main variant
  const targetVariant = variantToEdit || defaultVariant;

  const [sku, setSku] = useState(targetVariant?.sku || '');
  const [barcode, setBarcode] = useState(targetVariant?.barcode || '');
  const [variantName, setVariantName] = useState(targetVariant?.name || '');
  const [price, setPrice] = useState(targetVariant ? parseFloat(targetVariant.price) : 0);
  const [basePrice, setBasePrice] = useState(0); // Base cost for new stock batches
  const [stock, setStock] = useState(targetVariant?.stock || 0);
  const [hasOpenPrice, setHasOpenPrice] = useState(targetVariant?.has_open_price || false);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!isEdit) {
        // Create new entirely
        return productsApi.create({
          name,
          category_id: categoryId,
          variants: [{
            name: variantName,
            sku,
            barcode,
            price,
            stock,
            base_price: basePrice,
            has_open_price: hasOpenPrice
          }]
        });
      } else {
        // Edit flow
        // 1. Update product base info
        if (productToEdit.name !== name || productToEdit.category_id !== categoryId) {
          await productsApi.update(productToEdit.id, { name, category_id: categoryId });
        }
        // 2. Update variant price and stock if a target variant is provided
        if (targetVariant) {
          if (parseFloat(targetVariant.price) !== price) {
            await productsApi.updatePrice(targetVariant.id, price);
          }
          if (targetVariant.stock !== stock) {
            // API expects delta (+ for restock, - for reduction)
            const diff = stock - targetVariant.stock;
            await productsApi.updateStock(targetVariant.id, {
              quantity: diff,
              base_price: diff > 0 ? basePrice : 0,
              reason: 'ADJUSTMENT'
            });
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(isEdit ? 'Product updated' : 'Product created');
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to save product');
    }
  });

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>{isEdit ? 'Edit Product' : 'Add New Product'}</h2>
          <button onClick={onClose} className={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.formGroup}>
            <label>Product Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Espresso"
              className={styles.input}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Category</label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className={styles.input}
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <hr className={styles.divider} />
          <h3>Variant Details</h3>

          <div className={styles.gridVariant}>
            <div className={styles.formGroup}>
              <label>SKU *</label>
              <input
                type="text"
                value={sku}
                onChange={e => setSku(e.target.value)}
                disabled={isEdit}
                placeholder="e.g. LATTE-01"
                className={styles.input}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Barcode</label>
              <input
                type="text"
                value={barcode}
                onChange={e => setBarcode(e.target.value)}
                disabled={isEdit}
                placeholder="Optional"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Variant Name</label>
              <input
                type="text"
                value={variantName}
                onChange={e => setVariantName(e.target.value)}
                disabled={isEdit}
                placeholder="e.g. Regular"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Selling Price (Rp) *</label>
              <input
                type="number"
                min="0"
                value={price}
                onChange={e => setPrice(Number(e.target.value))}
                className={styles.input}
                disabled={hasOpenPrice}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Current Stock</label>
              <input
                type="number"
                min="0"
                value={stock}
                onChange={e => setStock(Number(e.target.value))}
                className={styles.input}
                disabled={isEdit}
              />
            </div>

            {/* Show Base Price only when adding new stock */}
            {(stock > (targetVariant?.stock || 0) || !isEdit) && (
              <div className={styles.formGroup}>
                <label>Base Cost (HPP) / Unit</label>
                <input
                  type="number"
                  min="0"
                  value={basePrice}
                  onChange={e => setBasePrice(Number(e.target.value))}
                  className={styles.input}
                  placeholder="Purchase cost"
                />
              </div>
            )}
          </div>

          <div className={styles.checkboxGroup}>
            <input
              type="checkbox"
              id="openPrice"
              checked={hasOpenPrice}
              onChange={e => setHasOpenPrice(e.target.checked)}
              disabled={isEdit}
            />
            <label htmlFor="openPrice">Allow Cashier to Enter Price (Open Price)</label>
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={saveMutation.isPending}>
            Cancel
          </button>
          <button
            className={styles.saveBtn}
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !name || !sku}
          >
            {saveMutation.isPending ? 'Saving...' : <><Save size={16} /> Save Product</>}
          </button>
        </div>
      </div>
    </div>
  );
}
