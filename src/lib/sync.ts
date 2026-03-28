import { getDB } from './db';
import { apiFetch } from './api';

export const syncOfflineTransactions = async () => {
  // If no internet, abort silently
  if (!navigator.onLine) return;

  const db = await getDB();
  const pending = await db.getAll('pending_transactions');

  if (pending.length === 0) return; // Nothing to sync

  // Extract exactly the payloads stored during checkout
  const transactions = pending.map(item => item.payload);

  try {
    // Rely on centralized apiFetch error throwing and auth wrapping
    await apiFetch('/offline/sync', {
      method: 'POST',
      body: JSON.stringify({ transactions })
    });

    // The backend safely received everything (queued failures for the Manager).
    // Now we must clear the local DB!
    const tx = db.transaction('pending_transactions', 'readwrite');
    for (const item of pending) {
      tx.store.delete(item.id);
    }
    await tx.done;
    console.log(`✅ ${pending.length} Offline transactions synced successfully!`);
    
  } catch (error) {
    console.warn('⚠️ Sync failed/Backend rejected syncing. Will retry later.', error);
  }
};