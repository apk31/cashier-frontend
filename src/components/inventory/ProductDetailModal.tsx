import { X, Package, Tag, Layers, Calendar } from 'lucide-react';
import styles from './ProductDetailModal.module.css';
import type { Product } from '../../types';

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
}

export default function ProductDetailModal({ product, onClose }: ProductDetailModalProps) {
  // Assuming the main variant for now
  const variant = product.variants?.[0];

  if (!variant) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        
        <div className={styles.header}>
          <h2>{product.name}</h2>
          <button onClick={onClose} className={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.content}>
          {/* Main Info Card */}
          <div className={styles.infoCard}>
            <div className={styles.infoGroup}>
              <span className={styles.infoLabel}><Tag size={12} style={{display: 'inline', marginRight: 4}}/> Category</span>
              <span className={styles.infoValue}>{product.category?.name || 'Uncategorized'}</span>
            </div>
            <div className={styles.infoGroup}>
              <span className={styles.infoLabel}>SKU</span>
              <span className={styles.infoValue}>{variant.sku}</span>
            </div>
            <div className={styles.infoGroup}>
              <span className={styles.infoLabel}>Selling Price</span>
              <span className={styles.infoValue}>
                Rp {parseFloat(variant.price).toLocaleString('id-ID')}
                {variant.has_open_price && <span className={styles.badge} style={{marginLeft: 8}}>Open Price</span>}
              </span>
            </div>
            <div className={styles.infoGroup}>
              <span className={styles.infoLabel}><Package size={12} style={{display: 'inline', marginRight: 4}}/> Total Stock</span>
              <span className={styles.infoValue}>{variant.stock} units</span>
            </div>
          </div>

          {/* FIFO Stock Batches Table */}
          <div>
            <h3 className={styles.sectionTitle}>
              <Layers size={16} style={{display: 'inline', marginRight: 6, verticalAlign: 'text-bottom'}}/> 
              Active Stock Batches (FIFO)
            </h3>
            
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date Received</th>
                    <th>Remaining Qty</th>
                    <th>Base Price (HPP)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(!variant.stock_batches || variant.stock_batches.length === 0) ? (
                    <tr>
                      <td colSpan={4} style={{textAlign: 'center', color: 'var(--text-muted)'}}>
                        No active stock batches. (Old stock may not have base price data).
                      </td>
                    </tr>
                  ) : (
                    variant.stock_batches.map((batch: any, index: number) => (
                      <tr key={batch.id}>
                        <td>
                          <Calendar size={12} style={{display: 'inline', marginRight: 4, color: 'var(--text-muted)'}}/>
                          {new Date(batch.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td style={{fontWeight: 600}}>{batch.remaining_qty} <span style={{fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400}}>/ {batch.initial_qty}</span></td>
                        <td>Rp {parseFloat(batch.base_price).toLocaleString('id-ID')}</td>
                        <td>
                          {index === 0 ? (
                            <span className={styles.badge} style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' }}>Next to clear</span>
                          ) : (
                            <span className={styles.badge} style={{ backgroundColor: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>Queued</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <p style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem'}}>
              * Transactions automatically deduct from the oldest batch ("Next to clear") first to calculate accurate COGS.
            </p>
          </div>
        </div>
        
      </div>
    </div>
  );
}