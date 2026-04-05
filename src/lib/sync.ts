import type { QueryClient } from '@tanstack/react-query';
import { getDB, removePendingTransaction } from './db';
import { apiFetch } from './api';

/**
 * Syncs all pending offline transactions to the server.
 *
 * @param queryClient  React Query client — all caches are invalidated after a
 *                     successful sync so every page gets fresh data automatically.
 * @param onClear      Callback to clear the in-memory offline store (avoids a
 *                     circular import between sync.ts and the Zustand store).
 */
export const syncOfflineTransactions = async (
  queryClient?: QueryClient,
  onClear?: () => void,
) => {
  if (!navigator.onLine) return;

  const db = await getDB();
  const pending = await db.getAll('pending_transactions');

  if (pending.length === 0) return;

  const transactions = pending.map(item => item.payload);

  try {
    await apiFetch('/offline/sync', {
      method: 'POST',
      body: JSON.stringify({ transactions }),
    });

    // ── Clean up local DB ─────────────────────────────────────────────────────
    // Remove each record individually so a partial failure doesn't wipe good records
    await Promise.all(pending.map(item => removePendingTransaction(item.id)));

    // ── Clear in-memory offline store ─────────────────────────────────────────
    onClear?.();

    console.log(`✅ ${pending.length} offline transaction(s) synced.`);

    // ── Invalidate ALL React Query caches ────────────────────────────────────
    // This is the key change: after sync every mounted query will refetch,
    // giving the user up-to-date stock counts, transaction lists, and reports
    // without a manual page refresh.
    if (queryClient) {
      await queryClient.invalidateQueries();
    }

  } catch (error) {
    console.warn('⚠️ Sync failed. Will retry on next online event.', error);
  }
};