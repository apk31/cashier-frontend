import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../../lib/api';
import { Download, Building2, Calculator, Receipt } from 'lucide-react';
import styles from './TaxReportTab.module.css';

export default function TaxReportTab() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);

  const { data: reportData, isLoading: loading } = useQuery({
    queryKey: ['reports-monthly', year, month],
    queryFn: () => reportsApi.monthly({ year, month })
  });
  
  const report = reportData;

  const handleDownloadSPT = () => {
    alert('Simulating PDF download for Form 1111 (SPT Masa PPN)...');
  };

  return (
    <div className={styles.container}>
      <div className={styles.controls}>
        <div className={styles.filterGroup}>
          <select value={month} onChange={e => setMonth(Number(e.target.value))}>
            {Array.from({length: 12}).map((_, i) => (
              <option key={i} value={i+1}>
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
        <div className={styles.document}>
          <div className={styles.docHeader}>
            <div className={styles.docTitle}>
              <h2>SURAT PEMBERITAHUAN MASA PAJAK PERTAMBAHAN NILAI (SPT MASA PPN)</h2>
              <p>Formulir 1111 - Masa Pajak: {new Date(0, report.period.month - 1).toLocaleString('id-ID', { month: 'long' })} {report.period.year}</p>
            </div>
            <Building2 size={48} className={styles.brandIcon} />
          </div>

          <div className={styles.entityInfo}>
            <div className={styles.infoRow}>
              <span>Nama PKP:</span>
              <strong>{report.store.name}</strong>
            </div>
            <div className={styles.infoRow}>
              <span>NPWP:</span>
              <strong>{report.tax.npwp || 'Belum Registrasi'}</strong>
            </div>
          </div>

          <div className={styles.taxCards}>
            <div className={styles.card}>
              <div className={styles.cardIcon}><Receipt size={24} /></div>
              <div className={styles.cardDetails}>
                <span className={styles.cardLabel}>Dasar Pengenaan Pajak (DPP)</span>
                <span className={styles.cardValue}>Rp {report.summary.dpp.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardIcon} style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
                <Calculator size={24} />
              </div>
              <div className={styles.cardDetails}>
                <span className={styles.cardLabel}>PPN Keluaran ({report.tax.ppn_rate}%)</span>
                <span className={styles.cardValue}>Rp {report.tax.ppn_amount.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>

          <div className={styles.disclaimer}>
            <p>* Laporan ini digenerate secara otomatis berdasarkan data transaksi tersinkronisasi. Pastikan nomor faktur disesuaikan sebelum di-upload ke e-Faktur DJP.</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
