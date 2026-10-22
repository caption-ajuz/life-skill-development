import api from './api.js';
import db from './db.js';

const { signal } = window.signals;

export const syncStatus = signal({
  isOnline: navigator.onLine,
  isSyncing: false,
  pendingCount: 0,
  lastSyncAt: null,
  error: null
});

export function generateClientId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'client_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}

export async function refreshPendingCount() {
  try {
    const count = await db.getPendingCount();
    syncStatus.value = {
      ...syncStatus.value,
      pendingCount: count
    };
    return count;
  } catch (err) {
    console.warn('Failed to get pending count:', err);
    return 0;
  }
}

export async function syncAll() {
  if (!navigator.onLine || syncStatus.value.isSyncing) {
    return;
  }

  syncStatus.value = { ...syncStatus.value, isSyncing: true, error: null };

  try {
    const [distributions, collections, transfers, areas] = await Promise.all([
      db.getPending('pendingDistributions'),
      db.getPending('pendingCollections'),
      db.getPending('pendingTransfers'),
      db.getPending('pendingAreas')
    ]);

    const totalToSync = distributions.length + collections.length + transfers.length + areas.length;
    if (totalToSync === 0) {
      syncStatus.value = {
        ...syncStatus.value,
        isSyncing: false,
        pendingCount: 0,
        lastSyncAt: new Date().toISOString()
      };
      return;
    }

    const payload = { distributions, collections, transfers, areas };
    const response = await api.post('/api/sync/push', payload);

    if (response && response.success && response.results) {
      const { results } = response;

      // Remove successfully synced distributions
      for (const item of (results.distributions.synced || []).concat(results.distributions.duplicates || [])) {
        if (item.clientId) await db.removePending('pendingDistributions', item.clientId);
      }

      // Remove successfully synced collections
      for (const item of (results.collections.synced || []).concat(results.collections.duplicates || [])) {
        if (item.clientId) await db.removePending('pendingCollections', item.clientId);
      }

      // Remove successfully synced transfers
      for (const item of (results.transfers.synced || []).concat(results.transfers.duplicates || [])) {
        if (item.clientId) await db.removePending('pendingTransfers', item.clientId);
      }

      // Remove successfully synced areas
      for (const item of (results.areas.synced || []).concat(results.areas.duplicates || [])) {
        if (item.clientId) await db.removePending('pendingAreas', item.clientId);
      }

      if (window.showToast) {
        window.showToast(`Synced ${totalToSync} offline entries successfully!`, 'success');
      }
    }

    const remaining = await refreshPendingCount();
    syncStatus.value = {
      ...syncStatus.value,
      isSyncing: false,
      pendingCount: remaining,
      lastSyncAt: new Date().toISOString()
    };
  } catch (err) {
    console.error('Offline sync failed:', err);
    syncStatus.value = {
      ...syncStatus.value,
      isSyncing: false,
      error: err.message
    };
  }
}

// Auto-sync listener on reconnection
window.addEventListener('online', () => {
  syncStatus.value = { ...syncStatus.value, isOnline: true };
  if (window.showToast) window.showToast('Back online! Syncing...', 'info');
  syncAll();
});

window.addEventListener('offline', () => {
  syncStatus.value = { ...syncStatus.value, isOnline: false };
  if (window.showToast) window.showToast('You are currently offline. Changes will save locally.', 'warning');
});

// Initial pending check
refreshPendingCount();
