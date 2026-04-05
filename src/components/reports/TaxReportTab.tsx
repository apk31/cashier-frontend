import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../../lib/api';
import { Download, Building2, Calculator, Receipt, TrendingUp, AlertTriangle, ShieldCheck } from 'lucide-react';
import styles from './TaxReportTab.module.css';

export default function TaxReportTab() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);

  const { data: report, isLoading: loading } = useQuery({
    queryKey: ['reports-monthly', year, month],
    queryFn: () => reportsApi.monthly({ year, month })
  });

  const handleDownloadSPT = () => {
    alert('Simulating PDF download for Form 1111 (SPT Masa PPN)...');
  };

  const taxConfig = report?.tax.config;
  const ytdPct = report?.tax.ytd_progress_pct ?? 0;
  const ytdRevenue = report?.tax.ytd_revenue ?? 0;
  const ytdRemaining = report?.tax.ytd_remaining_exemption ?? 0;
  const taxLiability = report?.tax.monthly_tax_liability ?? 0;
  const taxExplanation = report?.tax.tax_explanation ?? '';

  // Color for YTD progress bar
  const progressColor = ytdPct >= 90 ? 'var(--color-danger)' : ytdPct >= 70 ? 'var(--color-warning)' : 'var(--color-success)';

  return (
    <div className={styles.container}>
      <div className={styles.controls}>
        <div className={styles.filterGroup}>
          <select value={month} onChange={e => setMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }).map((_, i) => (
              <option key={i} value={i + 1}>
                {new Date(0, i).toLocaleString('id-ID', { month: 'long' })}
              </option>
            ))}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))}>
            {[currentYear, currentYear - 1, currentYear - 2].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <button className={styles.downloadBtn} onClick={handleDownloadSPT} disabled={!report || loading}>
          <Download size={18} />
          Export SPT Masa (PDF)
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}>Generating Tax Data...</div>
      ) : report ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* ── YTD Revenue Progress (UMKM Rp 500M Limit) ─────────────── */}
          <div className={styles.document} style={{ padding: '1.5rem 2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <TrendingUp size={22} style={{ color: progressColor }} />
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>
                Omzet Tahun Berjalan (YTD {year})
              </h3>
              <span style={{
                marginLeft: 'auto',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                background: taxConfig?.tax_status === 'FREE' ? '#d1fae5' : taxConfig?.tax_status === 'PPH_FINAL' ? '#fef3c7' : '#fee2e2',
                color: taxConfig?.tax_status === 'FREE' ? '#059669' : taxConfig?.tax_status === 'PPH_FINAL' ? '#d97706' : '#dc2626',
              }}>
                {taxConfig?.tax_status === 'FREE' ? '🟢 UMKM (Bebas Pajak)' :
                  taxConfig?.tax_status === 'PPH_FINAL' ? '🟡 PPh Final 0.5%' : '🔴 PKP'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.5rem' }}>
              <span>Rp {ytdRevenue.toLocaleString('id-ID')}</span>
              <span>Batas: Rp 500.000.000</span>
            </div>

            {/* Progress Bar */}
            <div style={{
              width: '100%', height: '12px', background: '#e2e8f0',
              borderRadius: '9999px', overflow: 'hidden', position: 'relative',
            }}>
              <div style={{
                width: `${Math.min(100, ytdPct)}%`, height: '100%',
                background: `linear-gradient(90deg, ${progressColor}, ${ytdPct > 80 ? '#dc2626' : progressColor})`,
                borderRadius: '9999px',
                transition: 'width 0.6s ease',
              }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.375rem' }}>
              <span>{ytdPct.toFixed(1)}% dari batas</span>
              <span>Sisa pengecualian: Rp {ytdRemaining.toLocaleString('id-ID')}</span>
            </div>

            {ytdPct >= 80 && ytdPct < 100 && taxConfig?.tax_status === 'FREE' && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem',
                padding: '0.625rem 0.75rem', background: '#fef3c7', borderRadius: '0.375rem',
                fontSize: '0.8125rem', fontWeight: 600, color: '#92400e',
              }}>
                <AlertTriangle size={16} />
                Mendekati batas Rp 480 juta! Sistem akan otomatis beralih ke PPh Final.
              </div>
            )}
          </div>

          {/* ── Tax Liability Card ─────────────────────────────────────── */}
          <div className={styles.document} style={{
            padding: '2rem',
            borderLeft: `4px solid ${taxLiability > 0 ? '#ef4444' : '#10b981'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '0.75rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: taxLiability > 0 ? '#fee2e2' : '#d1fae5',
                color: taxLiability > 0 ? '#dc2626' : '#059669',
                flexShrink: 0,
              }}>
                <Calculator size={28} />
              </div>
              <div>
                <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Kewajiban Pajak Bulan Ini
                </h3>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
                  Rp {taxLiability.toLocaleString('id-ID')}
                </div>
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.5 }}>
                  {taxExplanation}
                </p>
              </div>
            </div>
          </div>

          {/* ── Formal SPT Document ────────────────────────────────────── */}
          <div className={styles.document}>
            <div className={styles.docHeader}>
              <div className={styles.docTitle}>
                <h2>
                  {taxConfig?.tax_status === 'PKP'
                    ? 'SURAT PEMBERITAHUAN MASA PAJAK PERTAMBAHAN NILAI (SPT MASA PPN)'
                    : 'LAPORAN PAJAK PENGHASILAN BULANAN'}
                </h2>
                <p>
                  {taxConfig?.tax_status === 'PKP' ? 'Formulir 1111' : 'Ringkasan'} — Masa Pajak: {new Date(0, report.period.month - 1).toLocaleString('id-ID', { month: 'long' })} {report.period.year}
                </p>
              </div>
              <Building2 size={48} className={styles.brandIcon} />
            </div>

            <div className={styles.entityInfo}>
              <div className={styles.infoRow}>
                <span>Nama:</span>
                <strong>{report.store.name}</strong>
              </div>
              <div className={styles.infoRow}>
                <span>NPWP:</span>
                <strong>{taxConfig?.npwp || 'Belum Registrasi'}</strong>
              </div>
              <div className={styles.infoRow}>
                <span>Status:</span>
                <strong>{taxConfig?.tax_status === 'FREE' ? 'UMKM (Bebas)' : taxConfig?.tax_status === 'PPH_FINAL' ? 'PPh Final 0.5%' : 'PKP'}</strong>
              </div>
            </div>

            <div className={styles.taxCards}>
              <div className={styles.card}>
                <div className={styles.cardIcon}><Receipt size={24} /></div>
                <div className={styles.cardDetails}>
                  <span className={styles.cardLabel}>Omzet Bulan Ini</span>
                  <span className={styles.cardValue}>Rp {report.summary.revenue.toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardIcon} style={{ background: '#e0e7ff', color: '#4f46e5' }}>
                  <ShieldCheck size={24} />
                </div>
                <div className={styles.cardDetails}>
                  <span className={styles.cardLabel}>Net Profit</span>
                  <span className={styles.cardValue}>Rp {report.summary.net_profit.toLocaleString('id-ID')}</span>
                </div>
              </div>

              {taxConfig?.tax_status === 'PKP' && (
                <div className={styles.card}>
                  <div className={styles.cardIcon} style={{ background: '#fee2e2', color: '#dc2626' }}>
                    <Calculator size={24} />
                  </div>
                  <div className={styles.cardDetails}>
                    <span className={styles.cardLabel}>PPN Keluaran ({taxConfig.ppn_rate}%)</span>
                    <span className={styles.cardValue}>Rp {report.tax.ppn_collected.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              )}

              <div className={styles.card}>
                <div className={styles.cardIcon} style={{ background: '#fef3c7', color: '#d97706' }}>
                  <TrendingUp size={24} />
                </div>
                <div className={styles.cardDetails}>
                  <span className={styles.cardLabel}>Expenses</span>
                  <span className={styles.cardValue}>Rp {report.summary.expenses_total.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>

            <div className={styles.disclaimer}>
              <p>* Laporan ini digenerate secara otomatis berdasarkan data transaksi tersinkronisasi. Pastikan nomor faktur disesuaikan sebelum di-upload ke e-Faktur DJP.</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
