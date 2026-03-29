import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { uuidv7 } from 'uuidv7';
import type { PendingTransaction } from '../store/offlineTransactionStore';

// Define our local database schema
interface POSDB extends DBSchema {
  pending_transactions: {
    key: string;
    value: {
      id: string;
      payload: any;
      created_at: number; // Unix ms — used for 6-hour lockout check and date filtering
    };
  };
}

let dbPromise: Promise<IDBPDatabase<POSDB>>;

export const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<POSDB>('pos-offline-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('pending_transactions')) {
          db.createObjectStore('pending_transactions', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
};

/** Save a transaction locally when offline. Returns the generated local ID. */
export const saveOfflineTransaction = async (payload: any): Promise<string> => {
  const db = await getDB();
  const id = uuidv7();
  const record = {
    id,
    payload,
    created_at: Date.now(),
  };
  await db.put('pending_transactions', record);
  return id;
};

/** Read ALL pending transactions from IndexedDB (for the offline store + sync). */
export const getAllPendingTransactions = async (): Promise<PendingTransaction[]> => {
  const db = await getDB();
  const all = await db.getAll('pending_transactions');
  // Sort newest first so the UI shows most recent activity at the top
  return all.sort((a, b) => b.created_at - a.created_at) as PendingTransaction[];
};

/** Delete a single pending transaction by local ID (called after successful sync). */
export const removePendingTransaction = async (id: string): Promise<void> => {
  const db = await getDB();
  await db.delete('pending_transactions', id);
};