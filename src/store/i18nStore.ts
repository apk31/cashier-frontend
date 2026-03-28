import { create } from 'zustand';

type Language = 'en' | 'id';

type Dictionary = {
  [key: string]: {
    en: string;
    id: string;
  };
};

export const translations: Dictionary = {
  // Navigation
  'nav.pos': { en: 'Point of Sale', id: 'Kasir' },
  'nav.inventory': { en: 'Inventory', id: 'Inventaris' },
  'nav.reports': { en: 'Reports', id: 'Laporan' },
  'nav.settings': { en: 'Settings', id: 'Pengaturan' },
  'nav.logout': { en: 'Logout', id: 'Keluar' },

  // POS
  'pos.search': { en: 'Search product or SKU...', id: 'Cari produk atau SKU...' },
  'pos.cart.title': { en: 'Current Order', id: 'Pesanan Saat Ini' },
  'pos.cart.empty': { en: 'Your cart is empty', id: 'Keranjang anda kosong' },
  'pos.cart.empty_desc': { en: 'Scan a barcode or select from the grid to add items.', id: 'Pindai barcode atau pilih dari daftar untuk menambahkan item.' },
  'pos.cart.items': { en: 'items', id: 'barang' },
  'pos.cart.subtotal': { en: 'Subtotal', id: 'Subtotal' },
  'pos.cart.total': { en: 'Total', id: 'Total' },
  'pos.cart.cancel': { en: 'Cancel', id: 'Batal' },
  'pos.cart.charge': { en: 'Charge', id: 'Bayar' },
  'pos.cart.member': { en: 'Member Phone...', id: 'Telepon Member...' },
  'pos.cart.voucher': { en: 'Voucher Code...', id: 'Kode Voucher...' },
  'pos.cart.apply': { en: 'Apply', id: 'Pakai' },

  // Network & System
  'sys.online': { en: 'Online', id: 'Online' },
  'sys.offline': { en: 'Offline Mode', id: 'Mode Luring' },

  // Inventory
  'inv.title': { en: 'Inventory Management', id: 'Manajemen Inventaris' },
  'inv.add': { en: 'Add Product', id: 'Tambah Produk' },
  'inv.import': { en: 'Import CSV', id: 'Impor CSV' },
  'inv.search': { en: 'Search products...', id: 'Cari produk...' },
  
  // Reports
  'rep.title': { en: 'Financial Reports', id: 'Laporan Keuangan' },
  'rep.tax': { en: 'Tax Reports (SPT)', id: 'Laporan Pajak (SPT)' },

  // Settings
  'set.title': { en: 'Store Settings', id: 'Pengaturan Toko' },
};

interface I18nState {
  lang: Language;
  toggleLang: () => void;
  setLang: (lang: Language) => void;
  t: (key: keyof typeof translations) => string;
}

export const useI18nStore = create<I18nState>((set, get) => ({
  lang: (localStorage.getItem('pos_lang') as Language) || 'id',
  toggleLang: () => {
    const newLang = get().lang === 'en' ? 'id' : 'en';
    localStorage.setItem('pos_lang', newLang);
    set({ lang: newLang });
  },
  setLang: (lang: Language) => {
    localStorage.setItem('pos_lang', lang);
    set({ lang });
  },
  t: (key: keyof typeof translations) => {
    const { lang } = get();
    return translations[key as string]?.[lang] || String(key);
  },
}));
