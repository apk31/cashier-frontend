import { create } from 'zustand';
import { getAllPendingTransactions } from '../lib/db';

// Minimal shape we need for display — mirrors what saveOfflineTransaction stores
export interface PendingTransaction {
  id: string;           // local IndexedDB key (uuidv7)
  created_at: number;   // Unix ms timestamp
  payload: {
    items: Array<{ variant_id: string; quantity: number; discount: number; price?: number }>;
    payments: Array<{ method: string; amount: number }>;
    created_at?: string;
  };
}

// Computed summary we surface to the Reports page
export interface OfflineSummary {
  count: number;
  revenue: number;        // sum of payment amounts
  transaction_count: number;
}

interface OfflineTransactionState {
  pending: PendingTransaction[];
  // Load all pending records from IndexedDB into memory
  loadFromDB: () => Promise<void>;
  // Add a newly created offline transaction (called right after saveOfflineTransaction)
  addTransaction: (tx: PendingTransaction) => void;
  // Remove all — called after a successful sync
  clearAll: () => void;
  // Summary for a given date range (ISO strings or undefined = all)
  getSummary: (from?: Date, to?: Date) => OfflineSummary;
}

export const useOfflineTransactionStore = create<OfflineTransactionState>((set, get) => ({
  pending: [],

  loadFromDB: async () => {
    try {
      const all = await getAllPendingTransactions();
      set({ pending: all });
    } catch {
      // IndexedDB unavailable (SSR / private browsing) — silent fail
    }
  },

  addTransaction: (tx) =>
    set((state) => ({ pending: [tx, ...state.pending] })),

  clearAll: () => set({ pending: [] }),

  getSummary: (from?: Date, to?: Date): OfflineSummary => {
    const { pending } = get();
    const filtered = pending.filter((tx) => {
      const ts = tx.created_at;
      if (from && ts < from.getTime()) return false;
      if (to && ts > to.getTime()) return false;
      return true;
    });

    const revenue = filtered.reduce((sum, tx) => {
      // Sum all payments in the payload
      const paid = tx.payload.payments.reduce((s, p) => s + Number(p.amount), 0);
      return sum + paid;
    }, 0);

    return {
      count: filtered.length,
      revenue,
      transaction_count: filtered.length,
    };
  },
}));