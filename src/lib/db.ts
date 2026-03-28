import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { uuidv7 } from 'uuidv7';

// Define our local database schema
interface POSDB extends DBSchema {
  pending_transactions: {
    key: string;
    value: {
      id: string; // Local ID
      payload: any; // The exact JSON body the backend expects
      created_at: number; // Used for the 6-hour lockout check
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

// Helper: Save a transaction locally when offline
export const saveOfflineTransaction = async (payload: any) => {
  const db = await getDB();
  const id = uuidv7();
  await db.put('pending_transactions', {
    id,
    payload,
    created_at: Date.now(),
  });
  return id;
};