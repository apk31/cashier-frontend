import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Download, Edit2, Trash2, UploadCloud, AlertTriangle } from 'lucide-react';
import styles from './InventoryPage.module.css';
import { useI18nStore } from '../store/i18nStore';
import BulkImportModal from '../components/inventory/BulkImportModal';
import ProductModal from '../components/inventory/ProductModal';
import { productsApi, categoriesApi } from '../lib/api';
import toast from 'react-hot-toast';
import type { Product } from '../types';

export default function InventoryPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | undefined>(undefined);
  const [variantToEdit, setVariantToEdit] = useState<any>(undefined);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const queryClient = useQueryClient();
  const { t } = useI18nStore();

  // ── Network listener ────────────────────────────────────────────────────
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ── Offline Guard ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOnline) {
      setIsImportModalOpen(false);
      setIsProductModalOpen(false);
    }
  }, [isOnline]);

  // ── Data fetching ───────────────────────────────────────────────────────
  const { data: productData, isLoading } = useQuery({
    queryKey: ['products', categoryFilter, search],
    queryFn: () => productsApi.list({ q: search || undefined, category_id: categoryFilter || undefined, limit: 200 }),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
  });

  const products: Product[] = productData?.data ?? [];

  // ── Delete mutation ─────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produk dihapus');
    },
    onError: () => toast.error('Gagal menghapus produk'),
  });

  // ── Export ──────────────────────────────────────────────────────────────
  const handleExport = async () => {
    try {
      const result = await productsApi.bulkExport();
      const json = JSON.stringify(result.data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `products_export_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${result.data.length} products`);
    } catch {
      toast.error('Gagal mengekspor produk');
    }
  };

  return (
    <div className={styles.page}>
      
      {isImportModalOpen && (
        <BulkImportModal 
          onClose={() => setIsImportModalOpen(false)} 
          onSuccess={() => console.log('Simulated Refresh')}
        />
      )}

      {isProductModalOpen && (
        <ProductModal 
          onClose={() => setIsProductModalOpen(false)} 
          categories={categories}
          productToEdit={productToEdit}
          variantToEdit={variantToEdit}
        />
      )}

      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>
            {t('inv.title')}
            {!isOnline && <span className={styles.offlineTag}><AlertTriangle size={16} /> Read Only</span>}
          </h1>
          <p className={styles.subtitle}>
            {isOnline
              ? 'Manage your product catalog, pricing, and stock levels'
              : 'Network offline. You may only browse products; modifications are temporarily disabled.'}
          </p>
        </div>
        <div className={styles.actions}>
          <button
            className={styles.secondaryBtn}
            disabled={!isOnline}
            onClick={handleExport}
          >
            <Download size={18} />
            Export
          </button>
          <button
            className={styles.secondaryBtn}
            disabled={!isOnline}
            onClick={() => setIsImportModalOpen(true)}
          >
            <UploadCloud size={18} />
            {t('inv.import')}
          </button>
          <button
            className={styles.primaryBtn}
            disabled={!isOnline}
            onClick={() => {
              setProductToEdit(undefined);
              setVariantToEdit(undefined);
              setIsProductModalOpen(true);
            }}
          >
            <Plus size={18} />
            {t('inv.add')}
          </button>
        </div>
      </header>

      <div className={styles.card}>
        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <Search className={styles.searchIcon} size={18} />
            <input 
              type="text" 
              placeholder="Search by name or SKU..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          
          <div className={styles.filters}>
            <select
            className={styles.select}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Price (Rp)</th>
                <th>Stock</th>
                <th className={styles.actionsHeader}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={6} className={styles.emptyState}>Loading...</td></tr>
              )}
              {!isLoading && products.flatMap(product =>
                product.variants.map(variant => (
                  <tr key={variant.id}>
                    <td><span className={styles.badge}>{variant.sku}</span></td>
                    <td className={styles.fontWeightMedium}>
                      {product.name}{variant.name ? ` (${variant.name})` : ''}
                      {variant.has_open_price && <span className={styles.badge} style={{marginLeft: 6, background: '#7c3aed'}}>Open Price</span>}
                    </td>
                    <td>{product.category?.name}</td>
                    <td>Rp {parseFloat(variant.price).toLocaleString('id-ID')}</td>
                    <td>
                      <span className={`${styles.stockBadge} ${variant.stock <= 10 ? styles.stockLow : styles.stockGood}`}>
                        {variant.stock}
                      </span>
                    </td>
                    <td className={styles.actionsCell}>
                      <button className={styles.iconBtn} title="Edit" disabled={!isOnline}
                        onClick={() => {
                          setProductToEdit(product);
                          setVariantToEdit(variant);
                          setIsProductModalOpen(true);
                        }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                        title="Delete"
                        disabled={!isOnline || deleteMutation.isPending}
                        onClick={() => window.confirm(`Delete ${product.name}?`) && deleteMutation.mutate(product.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
              {!isLoading && products.length === 0 && (
                <tr>
                  <td colSpan={6} className={styles.emptyState}>No inventory items matched your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
