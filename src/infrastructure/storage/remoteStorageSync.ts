import { APP_CONFIG } from '../../config/appConfig';
import { ApiClient } from '../api/apiClient';

const DEFAULT_NAMESPACE = APP_CONFIG.STORAGE_PREFIX;
const SYNC_EXCLUDED_KEYS = new Set([
  'bkt_access_token',
  'bkt_refresh_token',
]);

let initialized = false;
let patchApplied = false;
let nativeSetItem: ((key: string, value: string) => void) | null = null;
let nativeRemoveItem: ((key: string) => void) | null = null;
let nativeClear: (() => void) | null = null;

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function shouldSyncKey(key: string) {
  return key.startsWith(DEFAULT_NAMESPACE) && !SYNC_EXCLUDED_KEYS.has(key);
}

async function pushEntries(entries: Array<{ key: string; value: string }>) {
  if (!entries.length) return;
  try {
    await ApiClient.request('/api/v1/app-storage/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ namespace: DEFAULT_NAMESPACE, entries }),
    });
  } catch (error) {
    console.warn('Remote storage sync failed:', error);
  }
}

async function deleteEntries(keys: string[]) {
  if (!keys.length) return;
  try {
    await ApiClient.request('/api/v1/app-storage/bulk', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ namespace: DEFAULT_NAMESPACE, keys }),
    });
  } catch (error) {
    console.warn('Remote storage delete sync failed:', error);
  }
}

function applyPatch() {
  if (!isBrowser() || patchApplied) return;

  const storage = window.localStorage as Storage & {
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
    clear: () => void;
  };

  nativeSetItem = storage.setItem.bind(storage);
  nativeRemoveItem = storage.removeItem.bind(storage);
  nativeClear = storage.clear.bind(storage);

  storage.setItem = (key: string, value: string) => {
    nativeSetItem?.(key, value);
    if (shouldSyncKey(key)) {
      void pushEntries([{ key, value }]);
    }
  };

  storage.removeItem = (key: string) => {
    nativeRemoveItem?.(key);
    if (shouldSyncKey(key)) {
      void deleteEntries([key]);
    }
  };

  storage.clear = () => {
    const keysToDelete: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && shouldSyncKey(key)) {
        keysToDelete.push(key);
      }
    }
    nativeClear?.();
    if (keysToDelete.length) {
      void deleteEntries(keysToDelete);
    }
  };

  patchApplied = true;
}

export async function initializeRemoteStorageCache() {
  if (!isBrowser()) return;
  applyPatch();
  if (initialized) return;

  try {
    const response = await ApiClient.request<{ namespace: string; entries: Array<{ key: string; value: string }> }>('/api/v1/app-storage?namespace=' + encodeURIComponent(DEFAULT_NAMESPACE));

    if (response.success && response.data?.entries?.length) {
      for (const entry of response.data.entries) {
        if (!shouldSyncKey(entry.key)) continue;
        nativeSetItem?.(entry.key, entry.value);
      }
    }
  } catch (error) {
    console.warn('Remote storage hydration skipped:', error);
  } finally {
    initialized = true;
  }
}
