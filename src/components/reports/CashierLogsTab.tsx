import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { shiftsApi } from '../../lib/api';
import { Clock, AlertTriangle, CheckCircle, Search } from 'lucide-react';
import styles from './TaxReportTab.module.css'; // Reuse table aesthetics
import TransactionsListModal from './TransactionsListModal';

export default function CashierLogsTab() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedShiftForTransactions, setSelectedShiftForTransactions] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['shifts-history', page, statusFilter],
    queryFn: () => shiftsApi.list({ page, limit: 15, status: statusFilter }).then(res => res),
  });

  const shifts = data?.data || [];

  return (
    <div style={{ padding: '1rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }} className="print-hide">
        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Cashier Cashup Logs</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <select 
            value={statusFilter} 
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid var(--border-color)' }}
          >
            <option value="">All Shifts</option>
            <option value="OPEN">Currently Open</option>
            <option value="CLOSED">Closed (Reconciled)</option>
          </select>
        </div>
      </div>

      <div className={styles.modernTableWrapper}>
        <table className={styles.modernTable}>
          <thead>
            <tr>
              <th>Cashier</th>
              <th>Shift Window</th>
              <th style={{ textAlign: 'center' }}>Transactions</th>
              <th style={{ textAlign: 'right' }}>Payment Breakdown (Sales)</th>
              <th style={{ textAlign: 'right' }}>Reconciliation (Cash Only)</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>Loading logs...</td></tr>
            ) : shifts.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>No shifts recorded.</td></tr>
            ) : (
              shifts.map((shift: any) => (
                <tr key={shift.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{shift.user?.name || 'Unknown'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {shift.status === 'OPEN' ? (
                        <span style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          <Clock size={12}/> Active Shift
                        </span>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          {shift.difference === 0 ? <CheckCircle size={12} color="var(--color-success)"/> : <AlertTriangle size={12} color={shift.difference > 0 ? "var(--color-warning)" : "var(--color-danger)"}/>} 
                          Closed
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.8125rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Opened:</span> {new Date(shift.opened_at).toLocaleString('id-ID')}
                    </div>
                    {shift.closed_at && (
                      <div style={{ fontSize: '0.8125rem', marginTop: 4 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Closed:</span> {new Date(shift.closed_at).toLocaleString('id-ID')}
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>
                    {shift._count?.transactions > 0 ? (
                      <button 
                        onClick={() => setSelectedShiftForTransactions(shift.id)}
                        style={{
                          background: 'var(--color-primary-light)', color: 'var(--color-primary)', border: 'none',
                          padding: '0.25rem 0.75rem', borderRadius: '1rem', cursor: 'pointer', fontWeight: 700,
                          display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem'
                        }}
                      >
                        <Search size={14} />
                        {shift._count?.transactions}
                      </button>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>0</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', fontSize: '0.8125rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: 4 }}>
                      <span style={{ color: 'var(--text-muted)' }}>CASH:</span>
                      <span style={{ fontWeight: 600 }}>Rp {Number(shift.breakdown?.cash || 0).toLocaleString('id-ID')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: 4 }}>
                      <span style={{ color: 'var(--text-muted)' }}>QRIS:</span>
                      <span style={{ fontWeight: 600 }}>Rp {Number(shift.breakdown?.qris || 0).toLocaleString('id-ID')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>TRANSFER:</span>
                      <span style={{ fontWeight: 600 }}>Rp {Number(shift.breakdown?.transfer || 0).toLocaleString('id-ID')}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', fontSize: '0.8125rem' }}>
                    {shift.status === 'OPEN' ? (
                      <div style={{ color: 'var(--text-muted)' }}>
                        Start Cash: Rp {Number(shift.starting_cash).toLocaleString('id-ID')}
                      </div>
                    ) : (
                      <>
                        <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Start: Rp {Number(shift.starting_cash).toLocaleString('id-ID')}</div>
                        <div style={{ marginBottom: 4 }}>Expected: <strong style={{ color: 'var(--text-main)' }}>Rp {Number(shift.expected_cash).toLocaleString('id-ID')}</strong></div>
                        <div style={{ marginBottom: 4 }}>Actual: <strong>Rp {Number(shift.actual_cash).toLocaleString('id-ID')}</strong></div>
                        <div style={{ 
                          marginTop: 8, paddingTop: 6, borderTop: '1px solid var(--border-color)',
                          fontWeight: 700,
                          color: shift.difference === 0 ? 'var(--color-success)' : shift.difference > 0 ? 'var(--color-warning)' : 'var(--color-danger)'
                        }}>
                          {shift.difference === 0 ? 'BALANCED' : shift.difference > 0 ? `+ Rp ${shift.difference.toLocaleString('id-ID')} OVER` : `- Rp ${Math.abs(shift.difference).toLocaleString('id-ID')} SHORT`}
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' }}>
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

      {selectedShiftForTransactions && (
        <TransactionsListModal
          shiftId={selectedShiftForTransactions}
          onClose={() => setSelectedShiftForTransactions(null)}
        />
      )}
    </div>
  );
}
