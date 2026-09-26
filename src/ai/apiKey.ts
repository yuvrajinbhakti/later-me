import * as SecureStore from 'expo-secure-store';
import { useEffect, useSyncExternalStore } from 'react';

const STORE_KEY = 'anthropic-api-key';

interface ApiKeyState {
  loaded: boolean;
  key: string | null;
}

/** One shared copy, so a key saved in Accountability shows up on the Steps screen without a reload. */
let state: ApiKeyState = { loaded: false, key: null };
const listeners = new Set<() => void>();
let loading: Promise<void> | null = null;

function publish(next: ApiKeyState) {
  state = next;
  listeners.forEach((l) => l());
}

function load() {
  loading ??= SecureStore.getItemAsync(STORE_KEY).then(
    (key) => publish({ loaded: true, key }),
    () => publish({ loaded: true, key: null }),
  );
  return loading;
}

export async function saveApiKey(key: string) {
  const trimmed = key.trim();
  await SecureStore.setItemAsync(STORE_KEY, trimmed);
  publish({ loaded: true, key: trimmed });
}

export async function removeApiKey() {
  await SecureStore.deleteItemAsync(STORE_KEY);
  publish({ loaded: true, key: null });
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useApiKey(): ApiKeyState {
  const snapshot = useSyncExternalStore(subscribe, () => state);
  useEffect(() => {
    void load();
  }, []);
  return snapshot;
}
