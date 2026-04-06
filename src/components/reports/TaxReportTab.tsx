import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../../lib/api';
import { Download, Building2, Calculator, Receipt, TrendingUp, AlertTriangle, ShieldCheck } from 'lucide-react';
import styles from './TaxReportTab.module.css';

export default function TaxReportTab() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const { data: report, isLoading: loading, status } = useQuery({
    queryKey: ['reports-monthly', year],
    queryFn: () => reportsApi.monthly({ year })
  });

  const handleDownloadSPT = () => {
    window.print();
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
      <div className={`${styles.controls} print-hide`}>
        <div className={styles.filterGroup}>
          <select value={year} onChange={e => setYear(Number(e.target.value))}>
            {Array.from({ length: 5 }).map((_, i) => (
              <option key={i} value={new Date().getFullYear() - i}>
                {new Date().getFullYear() - i}
              </option>
            ))}
          </select>
        </div>
        <button
          className={styles.downloadBtn}
          onClick={handleDownloadSPT}
          disabled={status === 'pending'}
        >
          <Download size={20} />
          Export SPT Tahunan (PDF)
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}>Generating Tax Data...</div>
      ) : report ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* ── YTD Revenue Progress (UMKM Rp 500M Limit) ─────────────── */}
          <div className="print-hide" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
                  Kewajiban Pajak Tahun Ini
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
          </div>

          {/* ── Formal Tax Document (Stockbit-style) ─────────────────────────────── */}
          <div className={styles.document}>
            
            {/* Header */}
            <div className={styles.docTopHeader}>
              <div className={styles.docCompanyInfo}>
                <h2 className={styles.companyName}>PT {report.store.name.toUpperCase()}</h2>
                <p>Jl. Contoh Alamat No. 123, Jakarta Selatan 12345</p>
                <p>Telp : (021) 12345 - 678</p>
              </div>
              <div className={styles.docLogo}>
                <Building2 size={32} />
                <span>CASHIER<strong style={{ color: '#000' }}>PRO</strong></span>
              </div>
            </div>

            {/* Document Title */}
            <div className={styles.docTitleRow}>
              <h1>Tax Report</h1>
              <span className={styles.badgeSolid}>
                {taxConfig?.tax_status === 'PKP' ? 'PPN' : taxConfig?.tax_status === 'PPH_FINAL' ? 'PPh Final' : 'Bebas'}
              </span>
            </div>

            {/* Meta Info */}
            <div className={styles.docMetaRow}>
              <div className={styles.metaLeft}>
                <div className={styles.metaGrid}>
                  <span className={styles.metaLabel}>Wajib Pajak</span>
                  <span className={styles.metaValue}>{report.store.name.toUpperCase()}</span>
                  <span className={styles.metaLabel}>NPWP / NIB</span>
                  <span className={styles.metaValue}>{taxConfig?.npwp || 'Belum Registrasi'}</span>
                </div>
              </div>
              <div className={styles.metaRight}>
                <span className={styles.metaLabel}>Tahun Pajak</span>
                <span className={styles.metaValue}>
                  {report.period.year}
                </span>
              </div>
            </div>

            {/* Section 1 */}
            <div className={styles.sectionTitle}>
              <h3>L-1 Rekapitulasi Penghasilan & Pajak</h3>
            </div>

            <div className={styles.modernTableWrapper}>
              <table className={styles.modernTable}>
                <thead>
                  <tr>
                    <th>Sumber/Jenis Penghasilan</th>
                    <th style={{ textAlign: 'right' }}>DPP/Penghasilan Bruto</th>
                    <th style={{ textAlign: 'right' }}>Pajak Terutang</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Transaksi Penjualan Reguler Tahun {report.period.year} (Platform Kasir)</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                      Rp{report.summary.revenue.toLocaleString('id-ID')}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                      Rp{taxLiability.toLocaleString('id-ID')}
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className={styles.tableFooter}>
                <span className={styles.footnote}>
                  (1) Pajak dihitung berdasarkan status kewajiban: {
                    taxConfig?.tax_status === 'FREE' ? 'Omzet di bawah 500jt (Bebas Pajak)' : 
                    taxConfig?.tax_status === 'PPH_FINAL' ? 'Tarif PPh Final 0.5% (PP 55/2022)' : `PPN Keluaran ${taxConfig?.ppn_rate}%`
                  }
                </span>
              </div>
            </div>

            {/* Section 2 */}
            <div className={styles.sectionTitle} style={{ marginTop: '2.5rem' }}>
              <h3>L-2 Ringkasan Laba Bersih Operasional</h3>
            </div>
            
            <div className={styles.modernTableWrapper} style={{ marginBottom: '2rem' }}>
              <div className={styles.flexTableRow}>
                <span className={styles.flexCellLabel}>Total Pendapatan (Bruto)</span>
                <span className={styles.flexCellValue}>Rp{report.summary.revenue.toLocaleString('id-ID')}</span>
              </div>
              <div className={styles.flexTableRow}>
                <span className={styles.flexCellLabel}>Total Beban Pokok (HPP)</span>
                <span className={styles.flexCellValue}>-Rp{report.summary.cogs_total.toLocaleString('id-ID')}</span>
              </div>
              <div className={styles.flexTableRow}>
                <span className={styles.flexCellLabel}>Total Beban Usaha (Pengeluaran)</span>
                <span className={styles.flexCellValue}>-Rp{report.summary.expenses_total.toLocaleString('id-ID')}</span>
              </div>
              <div className={`${styles.flexTableRow} ${styles.flexTableRowBold}`}>
                <span className={styles.flexCellLabel}>Laba Bersih Sebelum Kompensasi Pribadi</span>
                <span className={styles.flexCellValue}>Rp{report.summary.net_profit.toLocaleString('id-ID')}</span>
              </div>
            </div>

            {/* Section 3: Portofolio */}
            {report.inventory_valuation && report.inventory_valuation.length > 0 && (
              <>
                <div className={styles.sectionTitle} style={{ marginTop: '2.5rem' }}>
                  <h3>L-3 Portofolio Valuasi Aset Berjalan</h3>
                </div>
                <div className={styles.modernTableWrapper}>
                  <table className={styles.modernTable}>
                    <thead>
                      <tr>
                        <th>Kode Barang</th>
                        <th>Nama Item</th>
                        <th style={{ textAlign: 'right' }}>Lembar / Stok</th>
                        <th style={{ textAlign: 'right' }}>Harga Perolehan</th>
                        <th style={{ textAlign: 'right' }}>Nilai Investasi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.inventory_valuation.map((inv, i) => (
                        <tr key={i}>
                          <td>{inv.sku || '-'}</td>
                          <td>{inv.product_name}</td>
                          <td style={{ textAlign: 'right' }}>{inv.qty.toLocaleString('id-ID')}</td>
                          <td style={{ textAlign: 'right' }}>{inv.base_price.toLocaleString('id-ID')}</td>
                          <td style={{ textAlign: 'right' }}>{inv.valuation.toLocaleString('id-ID')}</td>
                        </tr>
                      ))}
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'right', fontWeight: 800 }}>TOTAL INVESTASI (BERJALAN)</td>
                        <td style={{ textAlign: 'right', fontWeight: 800 }}>
                          {report.inventory_valuation.reduce((sum, i) => sum + i.valuation, 0).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Section 4: History */}
            {report.transaction_history && report.transaction_history.length > 0 && (
              <>
                <div className={styles.sectionTitle} style={{ marginTop: '2.5rem' }}>
                  <h3>Transaction History - Penjualan</h3>
                </div>
                <div className={styles.modernTableWrapper}>
                  <table className={styles.modernTable}>
                    <thead>
                      <tr>
                        <th>Trans Date</th>
                        <th>Stock Name / Transaction</th>
                        <th style={{ textAlign: 'right' }}>Buy/Sell</th>
                        <th style={{ textAlign: 'right' }}>Shares</th>
                        <th style={{ textAlign: 'right' }}>Price</th>
                        <th style={{ textAlign: 'right' }}>Buy Value</th>
                        <th style={{ textAlign: 'right' }}>Sell Value</th>
                        <th style={{ textAlign: 'right' }}>Sales Tax</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.transaction_history.map((tx, i) => (
                        <tr key={i}>
                          <td>{new Date(tx.date).toLocaleDateString('id-ID')}</td>
                          <td style={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tx.product_name}</td>
                          <td style={{ textAlign: 'right' }}>{tx.type}</td>
                          <td style={{ textAlign: 'right' }}>{tx.qty.toLocaleString('id-ID')}</td>
                          <td style={{ textAlign: 'right' }}>{tx.price !== 0 ? tx.price.toLocaleString('id-ID') : '-'}</td>
                          <td style={{ textAlign: 'right' }}>{tx.buy_value !== 0 ? tx.buy_value.toLocaleString('id-ID') : '0'}</td>
                          <td style={{ textAlign: 'right' }}>{tx.sell_value !== 0 ? tx.sell_value.toLocaleString('id-ID') : '0'}</td>
                          <td style={{ textAlign: 'right' }}>{tx.tax !== 0 ? tx.tax.toLocaleString('id-ID') : '0'}</td>
                        </tr>
                      ))}
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'right', fontWeight: 800 }}>TOTAL REKAPITULASI ASET / PENJUALAN TAHUN INI</td>
                        <td style={{ textAlign: 'right', fontWeight: 800 }}>
                          {report.transaction_history.reduce((sum, t) => sum + t.buy_value, 0).toLocaleString('id-ID')}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800 }}>
                          {report.transaction_history.reduce((sum, t) => sum + t.sell_value, 0).toLocaleString('id-ID')}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800 }}>
                          {report.transaction_history.reduce((sum, t) => sum + t.tax, 0).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className={styles.disclaimerStockbit} style={{ marginTop: '3rem' }}>
              <strong>Disclaimer</strong>
              <p>
                Tax report ini merupakan data untuk keperluan rekapitulasi internal, bukan acuan akhir atau nasihat perpajakan. 
                Pengguna bisa mendapatkan nasihat profesional dari ahlinya sebelum mengambil tindakan terkait perpajakan. 
                Keakuratan data di dalam Surat Pemberitahuan (SPT) yang dilaporkan ke Direktorat Jenderal Pajak merupakan tanggung jawab pengguna, 
                bukan platform sistem POS.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
