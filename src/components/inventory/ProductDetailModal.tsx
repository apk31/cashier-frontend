import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Package, Tag, Layers, Calendar, ClipboardList, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import styles from './ProductDetailModal.module.css';
import { inventoryApi } from '../../lib/api';
import type { Product } from '../../types';

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
}

export default function ProductDetailModal({ product, onClose }: ProductDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'fifo' | 'audit'>('fifo');
  const variant = product.variants?.[0];

  const { data: stockLogs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ['stock-history', variant?.id],
    queryFn: () => inventoryApi.stockHistory({ variant_id: variant?.id }).then(res => res.data),
    enabled: !!variant && activeTab === 'audit',
  });

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

          {/* Tabs Navigation */}
          <div className={styles.tabsCol}>
            <button 
              className={`${styles.tabBtn} ${activeTab === 'fifo' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('fifo')}
            >
              <Layers size={16} /> FIFO Batches
            </button>
            <button 
              className={`${styles.tabBtn} ${activeTab === 'audit' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('audit')}
            >
              <ClipboardList size={16} /> Audit Logs
            </button>
          </div>

          {/* TAB: FIFO */}
          {activeTab === 'fifo' && (
            <div>
              <h3 className={styles.sectionTitle}>
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
          )}

          {/* TAB: AUDIT */}
          {activeTab === 'audit' && (
            <div>
              <h3 className={styles.sectionTitle}>
                Stock Alteration Timeline
              </h3>
              
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Action / Reason</th>
                      <th>Delta</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingLogs ? (
                      <tr><td colSpan={4} style={{textAlign: 'center'}}>Loading logs...</td></tr>
                    ) : stockLogs.length === 0 ? (
                      <tr><td colSpan={4} style={{textAlign: 'center', color: 'var(--text-muted)'}}>No history found.</td></tr>
                    ) : (
                      stockLogs.map((log: any) => (
                        <tr key={log.id}>
                          <td>
                            {new Date(log.created_at).toLocaleDateString('id-ID')} {new Date(log.created_at).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}
                          </td>
                          <td>
                            <span className={styles.badge} style={{ background: '#f1f5f9', color: '#475569' }}>
                              {log.reason}
                            </span>
                          </td>
                          <td style={{fontWeight: 700, color: log.change > 0 ? 'var(--color-success)' : 'var(--color-danger)'}}>
                            {log.change > 0 ? (
                              <span style={{display: 'flex', alignItems: 'center', gap: 4}}><ArrowUpRight size={14}/> +{log.change}</span>
                            ) : (
                              <span style={{display: 'flex', alignItems: 'center', gap: 4}}><ArrowDownRight size={14}/> {log.change}</span>
                            )}
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400, marginTop: 4 }}>
                              {log.old_stock} → {log.new_stock}
                            </div>
                          </td>
                          <td style={{ fontSize: '0.8125rem' }}>
                            <div style={{ marginBottom: 4 }}>{log.note || '-'}</div>
                            {log.details && Array.isArray(log.details) && log.details.length > 0 && (
                              <div style={{ padding: '4px 8px', background: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: '4px', marginTop: '6px' }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 2 }}>BATCH DETAILS:</div>
                                {log.details.map((d: any, idx: number) => (
                                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                    <span style={{ color: log.change > 0 ? 'var(--color-success)' : 'var(--color-danger)'}}>
                                      {log.change > 0 ? 'Added' : 'Cleared'} {d.qty}
                                    </span>
                                    <span style={{ color: 'var(--text-muted)', marginLeft: '12px' }}>
                                      @ {Number(d.base_price) === 0 ? 'Rp 0' : `Rp ${parseFloat(d.base_price).toLocaleString('id-ID')}`}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <p style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem'}}>
                * Shows exact timestamp, reason, and mandatory documentation for all stock changes.
              </p>
            </div>
          )}

        </div>
        
      </div>
    </div>
  );
}