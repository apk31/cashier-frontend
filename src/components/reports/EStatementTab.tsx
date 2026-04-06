import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Download, Landmark, ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';
import { reportsApi } from '../../lib/api';
import styles from './EStatementTab.module.css';

export default function EStatementTab() {
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);

  const { data, isLoading } = useQuery({
    queryKey: ['e-statement', fromDate, toDate],
    queryFn: () => {
      const startOfDay = new Date(fromDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(toDate);
      endOfDay.setHours(23, 59, 59, 999);
      return reportsApi.eStatement({ from: startOfDay.toISOString(), to: endOfDay.toISOString() });
    },
  });

  const { ledger = [], summary } = data || {};
  const handleExportPDF = () => {
    // The browser's native print API allows exporting properly styled PDF ledgers.
    // Make sure 'Save as PDF' is selected in the print dialog.
    window.print();
  };

  const typeColors: Record<string, string> = {
    SALE: 'var(--color-success-bg)',
    RESTOCK: 'var(--color-warning-bg)',
    EXPENSE: 'var(--color-danger-bg)',
  };

  return (
    <div className={styles.container}>
      <div className={`${styles.filterBar} print-hide`}>
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
        <button className={`${styles.exportBtn} print-hide`} onClick={handleExportPDF}>
          <Download size={16} />
          Export to PDF (Print)
        </button>
      </div>

      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <p>Total Revenue</p>
          <h3 style={{ color: 'var(--color-success)' }}>
            +Rp {Number(summary?.total_sales_revenue || 0).toLocaleString('id-ID')}
          </h3>
        </div>
        <div className={styles.summaryCard}>
          <p>Total COGS (HPP)</p>
          <h3 style={{ color: 'var(--color-danger)' }}>
            -Rp {Number(summary?.total_cogs || 0).toLocaleString('id-ID')}
          </h3>
        </div>
        <div className={styles.summaryCard} style={{ backgroundColor: 'rgba(230,240,255,0.1)' }}>
          <p>Gross Profit</p>
          <h3 style={{ color: 'var(--color-primary)' }}>
            Rp {Number(summary?.gross_profit || 0).toLocaleString('id-ID')}
          </h3>
        </div>
        <div className={styles.summaryCard}>
          <p>Expenses</p>
          <h3 style={{ color: 'var(--color-danger)' }}>
            -Rp {Number(summary?.total_expenses || 0).toLocaleString('id-ID')}
          </h3>
        </div>
        <div className={styles.summaryCard}>
          <p>Tax Collected</p>
          <h3 style={{ color: 'var(--color-warning)' }}>
            Rp {Number(summary?.total_tax_collected || 0).toLocaleString('id-ID')}
          </h3>
        </div>
        <div className={styles.summaryCard} style={{ backgroundColor: 'rgba(120,200,120,0.05)' }}>
          <p style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <Wallet size={14} /> Net Income
          </p>
          <h3 style={{ color: Number(summary?.net_income || 0) >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
            Rp {Number(summary?.net_income || 0).toLocaleString('id-ID')}
          </h3>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.25rem' }}>
        <div className={styles.summaryCard} style={{ flex: 1, padding: '0.875rem 1.25rem' }}>
          <p>Inventory Valuation (Global)</p>
          <h3 style={{ color: 'var(--color-warning)', fontSize: '1.125rem' }}>
            Rp {Number(summary?.current_inventory_valuation || 0).toLocaleString('id-ID')}
          </h3>
        </div>
      </div>

      <div className={styles.ledgerSection}>
        <h3 className={styles.tableTitle}>
          <Landmark size={20} /> Bank-style Ledger History ({fromDate} to {toDate})
        </h3>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date / Time</th>
                <th>Type</th>
                <th>Description</th>
                <th style={{ textAlign: 'right' }}>Debit (In)</th>
                <th style={{ textAlign: 'right' }}>Credit (Out)</th>
                <th style={{ textAlign: 'right' }}>Profit (Rp)</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className={styles.emptyState}>Loading ledger...</td></tr>
              ) : ledger.length === 0 ? (
                <tr><td colSpan={6} className={styles.emptyState}>No activity found for this period.</td></tr>
              ) : (
                ledger.map((entry: any, idx: number) => (
                  <tr key={idx} style={{ opacity: entry.type === 'RESTOCK' ? 0.7 : 1 }}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {new Date(entry.date).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td>
                      <span className={styles.txBadge} style={{ backgroundColor: typeColors[entry.type] || 'var(--color-primary-light)' }}>
                        {entry.type}
                      </span>
                    </td>
                    <td>
                      <div>{entry.description}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>ID: {entry.ref_id.slice(-8)}</div>
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--color-success)' }}>
                      {entry.debit > 0 ? (
                        <>
                          <ArrowUpRight size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                          {entry.debit.toLocaleString('id-ID')}
                        </>
                      ) : '-'}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--color-danger)' }}>
                      {entry.credit > 0 ? (
                        <>
                          <ArrowDownRight size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                          {entry.credit.toLocaleString('id-ID')}
                        </>
                      ) : '-'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                      {entry.profit !== null ? entry.profit.toLocaleString('id-ID') : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
