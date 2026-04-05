import { useState, useEffect } from 'react';
import { Save, Printer, Building2, Receipt, Image as ImageIcon, AlignCenter, ShieldCheck, AlertTriangle } from 'lucide-react';
import styles from './SettingsPage.module.css';
import { useI18nStore } from '../store/i18nStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../lib/api';
import type { TaxConfig } from '../types';
import toast from 'react-hot-toast';

type Tab = 'general' | 'printer' | 'tax' | 'receipt';

const DEFAULT_TAX: TaxConfig = {
  tax_status: 'FREE',
  pph_rate: 0.5,
  ppn_rate: 11,
  pb1_rate: 10,
  service_charge_rate: 5,
  apply_ppn_to_sales: false,
  apply_pb1_to_sales: false,
  npwp: null,
};

export default function SettingsPage() {
  const { t } = useI18nStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('general');

  // General State
  const [storeName, setStoreName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');

  // Printer State
  const [printerConnection, setPrinterConnection] = useState('USB');

  // Tax State — full Indonesian config
  const [taxConfig, setTaxConfig] = useState<TaxConfig>(DEFAULT_TAX);

  // Receipt State
  const [receiptMode, setReceiptMode] = useState<'text' | 'logo'>('text');
  const [footerMsg, setFooterMsg] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Load settings from API
  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get(),
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (settingsData) {
      const { store_info, tax_config, printer_config } = settingsData;
      setStoreName(store_info.name ?? '');
      setAddress(store_info.address ?? '');
      setPhone(store_info.phone ?? '');
      setFooterMsg(store_info.footer ?? '');
      setPrinterConnection(printer_config.connection ?? 'USB');

      // Merge with defaults to handle old configs missing new fields
      setTaxConfig({ ...DEFAULT_TAX, ...tax_config });
    }
  }, [settingsData]);

  // Network listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: () => settingsApi.update({
      store_info: { name: storeName, address, phone, logo_url: logoPreview, footer: footerMsg },
      tax_config: taxConfig as any,
      printer_config: { connection: printerConnection as 'USB' | 'BT' | 'IP', paper_width: 58, ip_address: null, bt_device_id: null },
    }),
    onSuccess: () => {
      toast.success('Pengaturan disimpan!');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: () => toast.error('Gagal menyimpan pengaturan'),
  });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => setLogoPreview(event.target?.result as string);
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const updateTax = (patch: Partial<TaxConfig>) => {
    setTaxConfig(prev => ({ ...prev, ...patch }));
  };

  const isSaving = saveMutation.isPending;

  const taxStatusLabel: Record<string, string> = {
    FREE: 'UMKM (Omzet < Rp 500jt/tahun)',
    PPH_FINAL: 'PPh Final 0.5% (Omzet > Rp 500jt)',
    PKP: 'PKP (Pengusaha Kena Pajak)',
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>
            {t('set.title')}
            {!isOnline && <span className={styles.offlineTag} style={{ marginLeft: 8, fontSize: '0.875rem', color: 'var(--color-danger)', fontWeight: 600 }}>[Offline]</span>}
          </h1>
          <p className={styles.subtitle}>
            {isOnline ? 'Configure global system configurations' : 'Network offline. Configuration changes are disabled.'}
          </p>
        </div>
        <button
          className={styles.saveBtn}
          onClick={() => saveMutation.mutate()}
          disabled={isSaving || !isOnline}
        >
          <Save size={18} />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </header>

      <div className={styles.layout}>
        {/* SIDEBAR TABS */}
        <div className={styles.sidebar}>
          <button
            className={`${styles.tabBtn} ${activeTab === 'general' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('general')}
          >
            <Building2 size={18} />
            General Info
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'printer' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('printer')}
          >
            <Printer size={18} />
            Hardware & Printer
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'tax' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('tax')}
          >
            <Receipt size={18} />
            Taxation (Indonesia)
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'receipt' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('receipt')}
          >
            <AlignCenter size={18} />
            Receipt Designer
          </button>
        </div>

        {/* CONTENT AREA */}
        <div className={styles.content}>

          {activeTab === 'general' && (
            <section className={styles.card}>
              <h2>Store Information</h2>
              <div className={styles.formGroup}>
                <label>Store Name</label>
                <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label>Address</label>
                <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} />
              </div>
              <div className={styles.formGroup}>
                <label>Phone Number</label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </section>
          )}

          {activeTab === 'printer' && (
            <section className={styles.card}>
              <h2>Printer Setup (ESC/POS)</h2>
              <div className={styles.formGroup}>
                <label>Connection Method</label>
                <select value={printerConnection} onChange={(e) => setPrinterConnection(e.target.value)}>
                  <option value="USB">USB (Local Serial Port)</option>
                  <option value="BT">Bluetooth</option>
                  <option value="IP">Network (IP/LAN)</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Paper Width</label>
                <select defaultValue="58">
                  <option value="58">58mm (Narrow Thermal)</option>
                  <option value="80">80mm (Wide Thermal)</option>
                </select>
              </div>
              <button className={styles.testBtn} onClick={() => alert('Triggering ESC/POS test sequence on bound printer...')}>Print Test Page</button>
            </section>
          )}

          {activeTab === 'tax' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 640 }}>
              {/* Income Tax Status */}
              <section className={styles.card}>
                <h2><ShieldCheck size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />Status Pajak Penghasilan</h2>

                <div className={styles.formGroup}>
                  <label>Status Usaha</label>
                  <select
                    value={taxConfig.tax_status}
                    onChange={(e) => updateTax({ tax_status: e.target.value as TaxConfig['tax_status'] })}
                    style={{ fontWeight: 600 }}
                  >
                    <option value="FREE">{taxStatusLabel.FREE}</option>
                    <option value="PPH_FINAL">{taxStatusLabel.PPH_FINAL}</option>
                    <option value="PKP">{taxStatusLabel.PKP}</option>
                  </select>
                </div>

                {taxConfig.tax_status === 'FREE' && (
                  <div style={{
                    padding: '0.875rem 1rem',
                    background: 'var(--color-success-bg)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8125rem',
                    color: 'var(--color-success)',
                    fontWeight: 500,
                    lineHeight: 1.5,
                  }}>
                    💡 Usaha dengan omzet di bawah Rp 500 juta/tahun tidak dikenakan pajak penghasilan. Sistem akan otomatis beralih ke PPh Final saat omzet mendekati batas (Rp 480 juta).
                  </div>
                )}

                {taxConfig.tax_status === 'PPH_FINAL' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div className={styles.formGroup}>
                      <label>Tarif PPh Final (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        value={taxConfig.pph_rate}
                        onChange={(e) => updateTax({ pph_rate: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div style={{
                      padding: '0.875rem 1rem',
                      background: 'var(--color-warning-bg)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.8125rem',
                      color: 'var(--color-warning)',
                      fontWeight: 500,
                      display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                    }}>
                      <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                      <span>PPh Final {taxConfig.pph_rate}% hanya dikenakan pada omzet yang melebihi Rp 500 juta pertama dalam tahun berjalan. Dibayar paling lambat tanggal 15 bulan berikutnya.</span>
                    </div>
                  </div>
                )}

                {taxConfig.tax_status === 'PKP' && (
                  <div style={{
                    padding: '0.875rem 1rem',
                    background: 'var(--color-danger-bg)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8125rem',
                    color: 'var(--color-danger)',
                    fontWeight: 500,
                  }}>
                    ⚠️ PKP wajib memungut dan menyetorkan PPN (Pajak Keluaran) yang tercatat di bawah ini.
                  </div>
                )}

                <div className={styles.formGroup}>
                  <label>NPWP</label>
                  <input
                    type="text"
                    placeholder="00.000.000.0-000.000"
                    value={taxConfig.npwp || ''}
                    onChange={(e) => updateTax({ npwp: e.target.value || null })}
                  />
                </div>
              </section>

              {/* Consumer Taxes */}
              <section className={styles.card}>
                <h2><Receipt size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />Pajak Konsumen (di Struk)</h2>

                <div className={styles.toggleGroup}>
                  <label className={styles.switch}>
                    <input type="checkbox" checked={taxConfig.apply_ppn_to_sales} onChange={(e) => updateTax({ apply_ppn_to_sales: e.target.checked })} />
                    <span className={styles.slider}></span>
                  </label>
                  <div className={styles.toggleLabel}>
                    <strong>PPN (Pajak Pertambahan Nilai)</strong>
                    <span>Tampilkan dan hitung PPN pada struk pembelian konsumen</span>
                  </div>
                </div>

                {taxConfig.apply_ppn_to_sales && (
                  <div className={`${styles.formGroup} ${styles.mt4}`}>
                    <label>Tarif PPN (%)</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={taxConfig.ppn_rate}
                      onChange={(e) => updateTax({ ppn_rate: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                )}

                <div className={styles.toggleGroup}>
                  <label className={styles.switch}>
                    <input type="checkbox" checked={taxConfig.apply_pb1_to_sales} onChange={(e) => updateTax({ apply_pb1_to_sales: e.target.checked })} />
                    <span className={styles.slider}></span>
                  </label>
                  <div className={styles.toggleLabel}>
                    <strong>PB1 (Pajak Restoran)</strong>
                    <span>Pajak Barang dan Jasa Tertentu — untuk restoran, cafe, dan F&B</span>
                  </div>
                </div>

                {taxConfig.apply_pb1_to_sales && (
                  <>
                    <div className={`${styles.formGroup} ${styles.mt4}`}>
                      <label>Tarif PB1 (%)</label>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        value={taxConfig.pb1_rate}
                        onChange={(e) => updateTax({ pb1_rate: parseFloat(e.target.value) || 0 })}
                      />
                    </div>

                    <div className={styles.toggleGroup}>
                      <label className={styles.switch}>
                        <input
                          type="checkbox"
                          checked={taxConfig.service_charge_rate > 0}
                          onChange={(e) => updateTax({ service_charge_rate: e.target.checked ? 5 : 0 })}
                        />
                        <span className={styles.slider}></span>
                      </label>
                      <div className={styles.toggleLabel}>
                        <strong>Service Charge</strong>
                        <span>Biaya layanan tambahan untuk restoran</span>
                      </div>
                    </div>

                    {taxConfig.service_charge_rate > 0 && (
                      <div className={`${styles.formGroup} ${styles.mt4}`}>
                        <label>Service Charge (%)</label>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          max="30"
                          value={taxConfig.service_charge_rate}
                          onChange={(e) => updateTax({ service_charge_rate: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    )}
                  </>
                )}
              </section>
            </div>
          )}

          {activeTab === 'receipt' && (
            <div className={styles.receiptDesigner}>
              <section className={styles.card}>
                <h2>Receipt Layout Studio</h2>

                <div className={styles.formGroup}>
                  <label>Header Mode</label>
                  <div className={styles.radioGroup}>
                    <label className={styles.radioLabel}>
                      <input type="radio" name="rmode" checked={receiptMode === 'text'} onChange={() => setReceiptMode('text')} /> Text Mode
                    </label>
                    <label className={styles.radioLabel}>
                      <input type="radio" name="rmode" checked={receiptMode === 'logo'} onChange={() => setReceiptMode('logo')} /> Logo Header
                    </label>
                  </div>
                </div>

                {receiptMode === 'logo' && (
                  <div className={styles.formGroup}>
                    <label>Store Logo (Monochrome Bitmap Target)</label>
                    <div className={styles.logoDropzone} style={{ opacity: isOnline ? 1 : 0.5, pointerEvents: isOnline ? 'auto' : 'none' }}>
                      <input type="file" accept="image/png, image/jpeg" onChange={handleLogoUpload} disabled={!isOnline} />
                      <ImageIcon size={24} />
                      <span>{logoPreview ? 'Change Logo Image' : 'Click to Upload Logo'}</span>
                    </div>
                  </div>
                )}

                <div className={styles.formGroup}>
                  <label>Custom Footer Message</label>
                  <textarea
                    value={footerMsg}
                    onChange={(e) => setFooterMsg(e.target.value)}
                    rows={2}
                    placeholder="e.g. WiFi: guest / Pass: 12345"
                  />
                </div>
              </section>

              {/* LIVE PREVIEW */}
              <div className={styles.previewPane}>
                <div className={styles.thermalPaper}>
                  {receiptMode === 'logo' && logoPreview ? (
                    <img src={logoPreview} className={styles.mockLogo} alt="Store Logo" />
                  ) : (
                    <h3 className={styles.mockName}>{storeName}</h3>
                  )}
                  <p className={styles.mockAddress}>{address}</p>
                  <p className={styles.mockPhone}>Telp: {phone}</p>
                  {taxConfig.npwp && <p className={styles.mockNpwp}>NPWP: {taxConfig.npwp}</p>}

                  <div className={styles.mockDivider}></div>
                  <div className={styles.mockRow}><span>1x Cafe Latte</span><span>Rp 25.000</span></div>
                  <div className={styles.mockRow}><span>2x Espresso</span><span>Rp 30.000</span></div>
                  <div className={styles.mockDivider}></div>
                  <div className={styles.mockRow}><span>Subtotal</span><span>Rp 55.000</span></div>

                  {taxConfig.apply_ppn_to_sales && (
                    <div className={styles.mockRow}><span>PPN ({taxConfig.ppn_rate}%)</span><span>Rp {Math.round(55000 * taxConfig.ppn_rate / 100).toLocaleString('id-ID')}</span></div>
                  )}
                  {taxConfig.apply_pb1_to_sales && (
                    <div className={styles.mockRow}><span>PB1 ({taxConfig.pb1_rate}%)</span><span>Rp {Math.round(55000 * taxConfig.pb1_rate / 100).toLocaleString('id-ID')}</span></div>
                  )}
                  {taxConfig.apply_pb1_to_sales && taxConfig.service_charge_rate > 0 && (
                    <div className={styles.mockRow}><span>Service ({taxConfig.service_charge_rate}%)</span><span>Rp {Math.round(55000 * taxConfig.service_charge_rate / 100).toLocaleString('id-ID')}</span></div>
                  )}

                  <div className={styles.mockDivider}></div>
                  <div className={styles.mockRow}>
                    <span>Total</span>
                    <strong>Rp {(() => {
                      let total = 55000;
                      if (taxConfig.apply_ppn_to_sales) total += Math.round(55000 * taxConfig.ppn_rate / 100);
                      if (taxConfig.apply_pb1_to_sales) total += Math.round(55000 * taxConfig.pb1_rate / 100);
                      if (taxConfig.apply_pb1_to_sales && taxConfig.service_charge_rate > 0) total += Math.round(55000 * taxConfig.service_charge_rate / 100);
                      return total.toLocaleString('id-ID');
                    })()}</strong>
                  </div>

                  <div className={styles.mockDivider}></div>
                  <p className={styles.mockFooter}>{footerMsg}</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
