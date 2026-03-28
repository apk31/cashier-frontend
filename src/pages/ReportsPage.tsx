import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, Calendar, Download } from 'lucide-react';
import styles from './ReportsPage.module.css';
import { useI18nStore } from '../store/i18nStore';
import TaxReportTab from '../components/reports/TaxReportTab';
import EStatementTab from '../components/reports/EStatementTab';
import { reportsApi } from '../lib/api';

type Tab = 'summary' | 'tax' | 'estatement';

export default function ReportsPage() {
  const { t } = useI18nStore();
  const [activeTab, setActiveTab] = useState<Tab>('summary');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Fetch Summary data using ISO strings for accurate parsing
  const { data: summaryData, isLoading } = useQuery({
    queryKey: ['reports-summary', fromDate, toDate],
    queryFn: () => {
      // Convert dates to proper ISO datetime boundaries
      const startOfDay = new Date(fromDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(toDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      return reportsApi.summary({ 
        from: startOfDay.toISOString(), 
        to: endOfDay.toISOString() 
      });
    },
  });

  // Fetch Low Stock data
  const { data: lowStockItems = [] } = useQuery({
    queryKey: ['reports-low-stock'],
    queryFn: () => reportsApi.lowStock(10),
  });

  const summary = summaryData?.summary;
  const topItems = summaryData?.top_items || [];

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

          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <div className={styles.metricInfo}>
                <span className={styles.metricLabel}>Total Revenue Range</span>
                <span className={styles.metricValue}>
                  {isLoading ? '...' : `Rp ${Number(summary?.revenue || 0).toLocaleString('id-ID')}`}
                </span>
              </div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricInfo}>
                <span className={styles.metricLabel}>Total Transactions</span>
                <span className={styles.metricValue}>
                  {isLoading ? '...' : (summary?.transaction_count || 0).toLocaleString('id-ID')}
                </span>
              </div>
            </div>
            <div className={styles.metricCard} style={{ backgroundColor: 'rgba(230,240,255,0.05)' }}>
              <div className={styles.metricInfo}>
                <span className={styles.metricLabel}>Gross Profit</span>
                <span className={styles.metricValue} style={{ color: 'var(--color-primary)' }}>
                  {isLoading ? '...' : `Rp ${Number(summary?.gross_profit || 0).toLocaleString('id-ID')}`}
                </span>
                <small style={{ color: 'var(--color-text-muted)' }}>
                  COGS: Rp {Number(summary?.cogs_total || 0).toLocaleString('id-ID')}
                </small>
              </div>
            </div>
          </div>

          {lowStockItems.length > 0 && (
            <div className={styles.tableSection} style={{ borderLeft: '4px solid var(--color-danger)', marginTop: '20px' }}>
              <h3 className={styles.tableTitle} style={{ color: 'var(--color-danger)' }}>Critical Low Stock Alerts ({lowStockItems.length})</h3>
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
                      <tr key={item.id}>
                        <td><span className={styles.txBadge}>{item.sku}</span></td>
                        <td>{item.product.name} {item.name ? `(${item.name})` : ''}</td>
                        <td>
                          <strong style={{ color: 'var(--color-danger)' }}>{item.stock} left</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
