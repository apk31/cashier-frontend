import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, Calendar, Download, CloudOff } from 'lucide-react';
import styles from './ReportsPage.module.css';
import { useI18nStore } from '../store/i18nStore';
import TaxReportTab from '../components/reports/TaxReportTab';
import EStatementTab from '../components/reports/EStatementTab';
import { reportsApi } from '../lib/api';
import { useOfflineTransactionStore } from '../store/offlineTransactionStore';

type Tab = 'summary' | 'tax' | 'estatement';

// Helper: returns YYYY-MM-DD in local time (avoids UTC shift from .split('T')[0])
function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function ReportsPage() {
  const { t } = useI18nStore();
  const [activeTab, setActiveTab] = useState<Tab>('summary');

  // Date range: defaults to 7 days ago → today
  // Uses local date strings so the filter matches the user's timezone
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return toLocalDateStr(d);
  });
  const [toDate, setToDate] = useState(() => toLocalDateStr(new Date()));

  // Build Date objects at midnight / end-of-day in local time for the API call
  const fromISO = (() => {
    const d = new Date(fromDate);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  })();
  const toISO = (() => {
    const d = new Date(toDate);
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  })();

  // ── Online data ─────────────────────────────────────────────────────────────
  const { data: summaryData, isLoading } = useQuery({
    queryKey: ['reports-summary', fromDate, toDate],
    queryFn: () => reportsApi.summary({ from: fromISO, to: toISO }),
    // Don't attempt to fetch when offline — serve last cached data
    networkMode: 'offlineFirst',
  });

  const { data: lowStockData } = useQuery({
    queryKey: ['reports-low-stock'],
    queryFn: () => reportsApi.lowStock(10),
    networkMode: 'offlineFirst',
  });

  // ── Offline pending transactions ────────────────────────────────────────────
  // These live in the Zustand store (sourced from IndexedDB) and update in real
  // time as the cashier makes new offline transactions — no network required.
  const getSummary = useOfflineTransactionStore(s => s.getSummary);
  const pendingCount = useOfflineTransactionStore(s => s.pending.length);

  const fromDate_d = new Date(fromDate);
  fromDate_d.setHours(0, 0, 0, 0);
  const toDate_d = new Date(toDate);
  toDate_d.setHours(23, 59, 59, 999);

  const offlineSummary = getSummary(fromDate_d, toDate_d);

  // ── Merged display numbers ──────────────────────────────────────────────────
  // When offline: show the last cached server numbers PLUS the new offline ones
  // When online:  show only server numbers (offline ones have already been synced)
  const isOffline = !navigator.onLine;
  const onlineRevenue = Number(summaryData?.summary.revenue ?? 0);
  const onlineTxCount = summaryData?.summary.transaction_count ?? 0;
  const onlineGrossProfit = Number(summaryData?.summary.gross_profit ?? 0);
  const onlineCogs = Number(summaryData?.summary.cogs_total ?? 0);

  const displayRevenue = onlineRevenue + (isOffline ? offlineSummary.revenue : 0);
  const displayTxCount = onlineTxCount + (isOffline ? offlineSummary.transaction_count : 0);

  const summary = summaryData?.summary;
  const topItems = summaryData?.top_items || [];
  const lowStockItems = lowStockData?.items ?? [];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{t('rep.title')}</h1>
          <p className={styles.subtitle}>Enterprise financial data, tax calculations, and aggregate performance.</p>
        </div>
      </header>

      <div className={styles.tabContainer}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'summary' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          <BarChart3 size={18} />
          Sales Summary
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'tax' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('tax')}
        >
          <TrendingUp size={18} />
          {t('rep.tax')}
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'estatement' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('estatement')}
        >
          <BarChart3 size={18} />
          E-Statement Ledger
        </button>
      </div>

      {activeTab === 'summary' && (
        <>
          {/* ── Date filter ───────────────────────────────────────────────── */}
          <div className={styles.filterBar}>
            <div className={styles.datePickerGroup}>
              <div className={styles.dateInputWrapper}>
                <Calendar size={16} className={styles.dateIcon} />
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className={styles.dateInput}
                />
              </div>
              <span className={styles.dateSep}>to</span>
              <div className={styles.dateInputWrapper}>
                <Calendar size={16} className={styles.dateIcon} />
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className={styles.dateInput}
                />
              </div>
            </div>
            <button className={styles.exportBtn} onClick={() => alert('Exporting transaction history to CSV...')}>
              <Download size={16} />
              Export CSV
            </button>
          </div>

          {/* ── Offline pending banner ────────────────────────────────────── */}
          {/* Shown only when offline AND there are unsynced transactions */}
          {isOffline && offlineSummary.count > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              background: 'var(--color-warning-bg)',
              color: 'var(--color-warning)',
              border: '1px solid var(--color-warning)',
              borderRadius: 'var(--radius-md)',
              padding: '0.875rem 1.25rem',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}>
              <CloudOff size={18} />
              <span>
                {offlineSummary.count} offline transaction{offlineSummary.count !== 1 ? 's' : ''} pending sync
                &nbsp;·&nbsp;
                +Rp {offlineSummary.revenue.toLocaleString('id-ID')} unsynced revenue
                &nbsp;(shown below)
              </span>
            </div>
          )}

          {/* Also show a global pending indicator when online but not yet synced */}
          {!isOffline && pendingCount > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              background: 'var(--color-success-bg)',
              color: 'var(--color-success)',
              border: '1px solid var(--color-success)',
              borderRadius: 'var(--radius-md)',
              padding: '0.875rem 1.25rem',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}>
              <BarChart3 size={18} />
              <span>Syncing {pendingCount} pending offline transaction{pendingCount !== 1 ? 's' : ''}…</span>
            </div>
          )}

          {/* ── Metric cards ──────────────────────────────────────────────── */}
          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <div className={styles.metricInfo}>
                <span className={styles.metricLabel}>
                  Total Revenue
                  {isOffline && offlineSummary.revenue > 0 && ' (incl. offline)'}
                </span>
                <span className={styles.metricValue}>
                  {isLoading ? '...' : `Rp ${displayRevenue.toLocaleString('id-ID')}`}
                </span>
                {isOffline && offlineSummary.revenue > 0 && (
                  <small style={{ color: 'var(--color-warning)', fontSize: '0.75rem' }}>
                    +Rp {offlineSummary.revenue.toLocaleString('id-ID')} offline (unsynced)
                  </small>
                )}
              </div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricInfo}>
                <span className={styles.metricLabel}>
                  Total Transactions
                  {isOffline && offlineSummary.count > 0 && ' (incl. offline)'}
                </span>
                <span className={styles.metricValue}>
                  {isLoading ? '...' : displayTxCount.toLocaleString('id-ID')}
                </span>
                {isOffline && offlineSummary.count > 0 && (
                  <small style={{ color: 'var(--color-warning)', fontSize: '0.75rem' }}>
                    +{offlineSummary.count} offline (unsynced)
                  </small>
                )}
              </div>
            </div>

            <div className={styles.metricCard} style={{ backgroundColor: 'rgba(230,240,255,0.05)' }}>
              <div className={styles.metricInfo}>
                <span className={styles.metricLabel}>Gross Profit</span>
                <span className={styles.metricValue} style={{ color: 'var(--color-primary)' }}>
                  {isLoading ? '...' : `Rp ${onlineGrossProfit.toLocaleString('id-ID')}`}
                </span>
                <small style={{ color: 'var(--color-text-muted)' }}>
                  COGS: Rp {onlineCogs.toLocaleString('id-ID')}
                </small>
              </div>
            </div>
          </div>

          {/* ── Low stock alerts ──────────────────────────────────────────── */}
          {lowStockData && lowStockData.total_alerts > 0 && (
            <div className={styles.tableSection} style={{ borderLeft: '4px solid var(--color-danger)', marginTop: '20px' }}>
              <h3 className={styles.tableTitle} style={{ color: 'var(--color-danger)' }}>
                Critical Low Stock Alerts ({lowStockData.total_alerts})
              </h3>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Product Name</th>
                      <th>Current Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockItems.map((item) => (
                      <tr key={item.variant_id}>
                        <td><span className={styles.txBadge}>{item.sku}</span></td>
                        <td>
                          {item.product_name}
                          {item.variant_name ? ` (${item.variant_name})` : ''}
                        </td>
                        <td>
                          <strong style={{ color: 'var(--color-danger)' }}>{item.current_stock} left</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Top items ─────────────────────────────────────────────────── */}
          <div className={styles.tableSection}>
            <h3 className={styles.tableTitle}>Top Selling Items ({fromDate} — {toDate})</h3>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Product</th>
                    <th>Variant</th>
                    <th>Qty Sold</th>
                    <th>Transactions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={5} className={styles.emptyState}>Loading...</td></tr>
                  ) : topItems.length === 0 ? (
                    <tr><td colSpan={5} className={styles.emptyState}>No sales data found for this period.</td></tr>
                  ) : (
                    topItems.map((item, idx) => (
                      <tr key={idx}>
                        <td><span className={styles.txBadge}>{String(item.sku)}</span></td>
                        <td>{String(item.product_name)}</td>
                        <td>{String(item.variant_name || '-')}</td>
                        <td><strong>{Number(item.qty_sold).toLocaleString('id-ID')}</strong></td>
                        <td>{Number(item.transactions).toLocaleString('id-ID')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'tax' && <TaxReportTab />}
      {activeTab === 'estatement' && <EStatementTab />}
    </div>
  );
}