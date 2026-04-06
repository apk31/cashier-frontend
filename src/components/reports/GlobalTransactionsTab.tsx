import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { transactionsApi } from '../../lib/api';
import { Receipt, ChevronDown, ChevronUp, Search, Calendar } from 'lucide-react';
import styles from './TaxReportTab.module.css'; // Use unified table layout styles

export default function GlobalTransactionsTab() {
  const [page, setPage] = useState(1);
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  // Simple date filtering (last 7 days usually by default, but we'll fetch all for this tab logic)
  // For production, you could extract the DatePicker from ReportsPage and pass it down.
  const { data, isLoading } = useQuery({
    queryKey: ['transactions', 'global', page],
    queryFn: () => transactionsApi.list({ page, limit: 15 }).then(res => res),
  });

  const transactions = data?.data || [];

  const toggleExpand = (id: string) => {
    setExpandedTxId(prev => prev === id ? null : id);
  };

  return (
    <div style={{ padding: '1rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }} className="print-hide">
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <DatabaseIcon /> Master Transaction Ledger
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', marginTop: '0.25rem' }}>
            Global master view of every receipt processed through the POS.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading global ledger...</div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No transactions recorded.</div>
        ) : (
          transactions.map((tx: any) => {
            const isExpanded = expandedTxId === tx.id;
            const isSystemAdj = tx.items?.length === 0;

            return (
              <div key={tx.id} style={{ 
                border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', 
                background: 'var(--bg-app)', overflow: 'hidden'
              }}>
                <div 
                  onClick={() => toggleExpand(tx.id)}
                  style={{ 
                    padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    cursor: 'pointer', background: isExpanded ? 'var(--bg-surface-hover)' : 'var(--bg-surface)',
                    borderLeft: isSystemAdj ? '4px solid var(--color-warning)' : '4px solid transparent'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                        {isSystemAdj ? 'SYSTEM ADJUSTMENT' : `#${tx.id.split('-')[0].toUpperCase()}`}
                      </span>
                      <span style={{ 
                        fontSize: '0.75rem', padding: '0.125rem 0.6rem', borderRadius: '1rem', fontWeight: 600,
                        background: isSystemAdj ? 'var(--color-warning-bg)' : tx.status === 'PAID' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                        color: isSystemAdj ? 'var(--color-warning)' : tx.status === 'PAID' ? 'var(--color-success)' : 'var(--color-danger)'
                      }}>
                        {isSystemAdj ? 'CASHUP DISCREPANCY' : tx.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Calendar size={12}/> {new Date(tx.created_at).toLocaleString('id-ID')}</span>
                      <span>Handler: <b>{tx.user?.name || 'System'}</b></span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: '1.125rem', color: isSystemAdj ? (tx.total < 0 ? 'var(--color-danger)' : 'var(--color-success)') : 'inherit' }}>
                        {tx.total < 0 ? '-' : ''}Rp {Math.abs(Number(tx.total)).toLocaleString('id-ID')}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
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
                        <strong>System Notice:</strong> This transaction was automatically generated because Cashier <b>{tx.user?.name}</b> closed their shift with a {tx.total < 0 ? 'SHORTAGE' : 'OVERAGE'}. 
                        <br/><br/>Amount: <b>{tx.total < 0 ? '-' : '+'}Rp {Math.abs(Number(tx.total)).toLocaleString('id-ID')}</b>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', gap: '3rem', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                          <div>
                            <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Customer / Member</span>
                            <span style={{ fontWeight: 600 }}>{tx.member ? `${tx.member.name} (${tx.member.phone})` : 'Walk-in'}</span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Associated Shift ID</span>
                            <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{tx.shift_id ? `#${tx.shift_id.split('-')[0].toUpperCase()}` : 'No Shift Logged'}</span>
                          </div>
                        </div>

                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                          <thead>
                            <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                              <th style={{ textAlign: 'left', padding: '0.5rem 0', fontWeight: 500 }}>Purchased Item</th>
                              <th style={{ textAlign: 'center', padding: '0.5rem 0', fontWeight: 500 }}>Qty</th>
                              <th style={{ textAlign: 'right', padding: '0.5rem 0', fontWeight: 500 }}>Unit Price</th>
                              <th style={{ textAlign: 'right', padding: '0.5rem 0', fontWeight: 500 }}>Total Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tx.items?.map((item: any, idx: number) => (
                              <tr key={idx} style={{ borderBottom: '1px solid var(--border-color-light)' }}>
                                <td style={{ padding: '0.75rem 0' }}>
                                  {item.variant?.product?.name || 'Unknown Item'}
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
                              <span style={{ color: 'var(--text-muted)' }}>Tax (System)</span>
                              <span>Rp {Number(tx.tax_amount).toLocaleString('id-ID')}</span>
                            </div>
                            {tx.discount_total > 0 && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-danger)' }}>
                                <span>Discount Total</span>
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
          })
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
        <button 
          disabled={page === 1}
          onClick={() => setPage(p => Math.max(1, p - 1))}
          style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
        >
          Previous Page
        </button>
        <button 
          disabled={(data?.data?.length || 0) < 15}
          onClick={() => setPage(p => p + 1)}
          style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid var(--border-color)', background: 'var(--bg-surface)', cursor: (data?.data?.length || 0) < 15 ? 'not-allowed' : 'pointer' }}
        >
          Next Page
        </button>
      </div>
    </div>
  );
}

function DatabaseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3"/>
      <path d="M3 5V19A9 3 0 0 0 21 19V5"/>
      <path d="M3 12A9 3 0 0 0 21 12"/>
    </svg>
  );
}
