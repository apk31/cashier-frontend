import { useState, useEffect } from 'react';
import { Save, Printer, Building2, Receipt, Image as ImageIcon, AlignCenter } from 'lucide-react';
import styles from './SettingsPage.module.css';
import { useI18nStore } from '../store/i18nStore';
import { useQuery, useMutation } from '@tanstack/react-query';
import { settingsApi } from '../lib/api';
import toast from 'react-hot-toast';

type Tab = 'general' | 'printer' | 'tax' | 'receipt';

export default function SettingsPage() {
  const { t } = useI18nStore();
  const [activeTab, setActiveTab] = useState<Tab>('general');

  // General State
  const [storeName, setStoreName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  
  // Printer State
  const [printerConnection, setPrinterConnection] = useState('USB');
  
  // Tax State
  const [isPkp, setIsPkp] = useState(false);
  const [npwp, setNpwp] = useState('');

  // Receipt State
  const [receiptMode, setReceiptMode] = useState<'text'|'logo'>('text');
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
      setIsPkp(tax_config.is_pkp ?? false);
      setNpwp(tax_config.npwp ?? '');
      setPrinterConnection(printer_config.connection ?? 'USB');
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
      tax_config: { is_pkp: isPkp, npwp: npwp || null, ppn_rate: 11 },
      printer_config: { connection: printerConnection as 'USB' | 'BT' | 'IP', paper_width: 58, ip_address: null, bt_device_id: null },
    }),
    onSuccess: () => toast.success('Pengaturan disimpan!'),
    onError: () => toast.error('Gagal menyimpan pengaturan'),
  });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => setLogoPreview(event.target?.result as string);
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const isSaving = saveMutation.isPending;

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
            Tax Configuration
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
            <section className={styles.card}>
              <h2>Tax & PPN Configuration</h2>
              <div className={styles.toggleGroup}>
                <label className={styles.switch}>
                  <input type="checkbox" checked={isPkp} onChange={(e) => setIsPkp(e.target.checked)} />
                  <span className={styles.slider}></span>
                </label>
                <div className={styles.toggleLabel}>
                  <strong>PKP Enabled (Collect 11% VAT)</strong>
                  <span>Check this if the business is registered for PPN (Pengusaha Kena Pajak)</span>
                </div>
              </div>
              
              {isPkp && (
                <div className={`${styles.formGroup} ${styles.mt4}`}>
                  <label>NPWP Number</label>
                  <input 
                    type="text" 
                    placeholder="00.000.000.0-000.000" 
                    value={npwp} 
                    onChange={(e) => setNpwp(e.target.value)} 
                  />
                </div>
              )}
            </section>
          )}

          {activeTab === 'receipt' && (
            <div className={styles.receiptDesigner}>
              <section className={styles.card}>
                <h2>Receipt Layout Studio</h2>
                
                <div className={styles.formGroup}>
                  <label>Header Mode</label>
                  <div className={styles.radioGroup}>
                    <label className={styles.radioLabel}>
                      <input 
                        type="radio" 
                        name="rmode" 
                        checked={receiptMode === 'text'} 
                        onChange={() => setReceiptMode('text')} 
                      /> Text Mode
                    </label>
                    <label className={styles.radioLabel}>
                      <input 
                        type="radio" 
                        name="rmode" 
                        checked={receiptMode === 'logo'} 
                        onChange={() => setReceiptMode('logo')} 
                      /> Logo Header
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
                  {isPkp && npwp && <p className={styles.mockNpwp}>NPWP: {npwp}</p>}
                  
                  <div className={styles.mockDivider}></div>
                  <div className={styles.mockRow}><span>1x Cafe Latte</span><span>Rp 25.000</span></div>
                  <div className={styles.mockRow}><span>2x Espresso</span><span>Rp 30.000</span></div>
                  <div className={styles.mockDivider}></div>
                  <div className={styles.mockRow}><span>Total</span><strong>Rp 55.000</strong></div>
                  
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
