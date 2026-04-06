import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { transactionsApi } from '../../lib/api';
import { X, Receipt, Search, ChevronDown, ChevronUp } from 'lucide-react';
import styles from './TaxReportTab.module.css';

interface TransactionsListModalProps {
  shiftId: string;
  onClose: () => void;
}

export default function TransactionsListModal({ shiftId, onClose }: TransactionsListModalProps) {
  const [page, setPage] = useState(1);
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', 'shift', shiftId, page],
    queryFn: () => transactionsApi.list({ shift_id: shiftId, page, limit: 15 }).then(res => res),
  });

  const transactions = data?.data || [];

  const toggleExpand = (id: string) => {
    setExpandedTxId(prev => prev === id ? null : id);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000
    }}>
      <div style={{
        background: 'var(--bg-app)', padding: '2rem', borderRadius: 'var(--radius-xl)',
        width: '90%', maxWidth: '900px', maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border-color)', position: 'relative'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', margin: '0 0 0.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Receipt size={24} color="var(--color-primary)" />
              Shift Transactions History
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', margin: 0 }}>
              Detailed breakdown of all receipts processed during this shift.
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'var(--bg-surface-hover)', border: 'none', width: '36px', height: '36px',
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
          }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isLoading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading transactions...</div>
          ) : transactions.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No transactions found for this shift.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {transactions.map((tx: any) => {
                const isExpanded = expandedTxId === tx.id;
                const isSystemAdj = tx.items?.length === 0;
                
                return (
                  <div key={tx.id} style={{ 
                    border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', 
                    background: 'var(--bg-surface)', overflow: 'hidden'
                  }}>
                    <div 
                      onClick={() => toggleExpand(tx.id)}
                      style={{ 
                        padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        cursor: 'pointer', background: isExpanded ? 'var(--bg-surface-hover)' : 'transparent',
                        borderLeft: isSystemAdj ? '4px solid var(--color-warning)' : '4px solid transparent'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                            {tx.items?.length === 0 ? 'SYSTEM-ADJUSTMENT' : `#${tx.id.split('-')[0].toUpperCase()}`}
                          </span>
                          <span style={{ 
                            fontSize: '0.75rem', padding: '0.125rem 0.5rem', borderRadius: '1rem',
                            background: tx.status === 'PAID' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                            color: tx.status === 'PAID' ? 'var(--color-success)' : 'var(--color-danger)'
                          }}>
                            {tx.status}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                          {new Date(tx.created_at).toLocaleString('id-ID')}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700 }}>Rp {Number(tx.total).toLocaleString('id-ID')}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {tx.payments?.map((p: any) => p.method).join(', ') || 'Unknown'}
                          </div>
                        </div>
                        {isExpanded ? <ChevronUp size={20} color="var(--text-muted)" /> : <ChevronDown size={20} color="var(--text-muted)" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-app)' }}>
                        {isSystemAdj ? (
                          <div style={{ padding: '1rem', background: 'var(--color-warning-bg)', color: 'var(--text-main)', borderRadius: 'var(--radius-sm)' }}>
                            <strong>System Notice:</strong> This transaction was automatically generated because Cashier <b>{tx.user?.name}</b> closed their shift with a {Number(tx.total) < 0 ? 'SHORTAGE' : 'OVERAGE'}. 
                            <br/><br/>Amount: <b>{Number(tx.total) < 0 ? '-' : '+'}Rp {Math.abs(Number(tx.total)).toLocaleString('id-ID')}</b>
                          </div>
                        ) : (
                          <>
                            <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                          <div>
                            <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Cashier</span>
                            <span style={{ fontWeight: 600 }}>{tx.user?.name || 'System'}</span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Customer (Member)</span>
                            <span style={{ fontWeight: 600 }}>{tx.member ? `${tx.member.name} (${tx.member.phone})` : 'Walk-in Customer'}</span>
                          </div>
                        </div>

                        <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                          Items Purchased
                        </h4>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                          <thead>
                            <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                              <th style={{ textAlign: 'left', padding: '0.5rem 0', fontWeight: 500 }}>Item</th>
                              <th style={{ textAlign: 'center', padding: '0.5rem 0', fontWeight: 500 }}>Qty</th>
                              <th style={{ textAlign: 'right', padding: '0.5rem 0', fontWeight: 500 }}>Price</th>
                              <th style={{ textAlign: 'right', padding: '0.5rem 0', fontWeight: 500 }}>Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tx.items?.map((item: any, idx: number) => (
                              <tr key={idx} style={{ borderBottom: '1px solid var(--border-color-light)' }}>
                                <td style={{ padding: '0.75rem 0' }}>
                                  {item.variant?.product?.name || 'Unknown'}
                                  {item.variant?.name ? ` (${item.variant.name})` : ''}
                                  {item.discount > 0 && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-danger)' }}>Disc: -Rp {Number(item.discount).toLocaleString('id-ID')}</div>
                                  )}
                                </td>
                                <td style={{ textAlign: 'center', padding: '0.75rem 0' }}>{item.qty}</td>
                                <td style={{ textAlign: 'right', padding: '0.75rem 0' }}>Rp {Number(item.price).toLocaleString('id-ID')}</td>
                                <td style={{ textAlign: 'right', padding: '0.75rem 0', fontWeight: 600 }}>
                                  Rp {((Number(item.price) * (item.qty || 0)) - Number(item.discount)).toLocaleString('id-ID')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
                              <span>Rp {Number(tx.subtotal).toLocaleString('id-ID')}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: 'var(--text-muted)' }}>Tax</span>
                              <span>Rp {Number(tx.tax_amount).toLocaleString('id-ID')}</span>
                            </div>
                            {tx.discount_total > 0 && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-danger)' }}>
                                <span>Total Discount</span>
                                <span>-Rp {Number(tx.discount_total).toLocaleString('id-ID')}</span>
                              </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', marginTop: '0.25rem', fontSize: '1rem' }}>
                              <span>Grand Total</span>
                              <span>Rp {Number(tx.total).toLocaleString('id-ID')}</span>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <button 
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
          >
            Previous
          </button>
          <button 
            disabled={(data?.data?.length || 0) < 15}
            onClick={() => setPage(p => p + 1)}
            style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', cursor: (data?.data?.length || 0) < 15 ? 'not-allowed' : 'pointer' }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
