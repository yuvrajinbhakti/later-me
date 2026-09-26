import { createContext, useContext, useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import { AppState as RNAppState } from 'react-native';
import { UsageStats } from '../../modules/usage-stats';
import { emptyState, makeId } from '../domain/quests';
import type { AppState } from '../domain/types';
import { syncWatcher, type SyncAction } from '../watcher/config';
import { legacyWatcherWasOn, loadAppState, saveAppState } from './persist';
import { reducer, type Action } from './reducer';

interface AppStore {
  state: AppState;
  ready: boolean;
  dispatch: (action: Action) => void;
  /** Result of the last push to the native watcher; ok is false when the platform refused to start it. */
  lastSync: { action: SyncAction; ok: boolean } | null;
  resync: () => void;
}

const StoreContext = createContext<AppStore | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, emptyState);
  const [ready, setReady] = useState(false);
  const [lastSync, setLastSync] = useState<AppStore['lastSync']>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    loadAppState(new Date(), makeId, { watcherRunning: legacyWatcherWasOn(UsageStats), isDev: __DEV__ })
      .then((loaded) => dispatch({ type: 'hydrate', state: loaded }))
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  // Nothing is saved or pushed to the watcher before hydration, so defaults never overwrite real data.
  useEffect(() => {
    if (!ready) return;
    saveAppState(state).catch(() => undefined);
    setLastSync(syncWatcher(state));
  }, [state, ready]);

  useEffect(() => {
    const sub = RNAppState.addEventListener('change', (next) => {
      if (next === 'active' && ready) setLastSync(syncWatcher(stateRef.current));
    });
    return () => sub.remove();
  }, [ready]);

  const resync = () => setLastSync(syncWatcher(stateRef.current));

  return (
    <StoreContext.Provider value={{ state, ready, dispatch, lastSync, resync }}>{children}</StoreContext.Provider>
  );
}

export function useAppStore(): AppStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useAppStore must be used inside AppStoreProvider');
  return store;
}
