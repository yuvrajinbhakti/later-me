import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState as RNAppState } from 'react-native';
import { UsageStats } from '../../../modules/usage-stats';
import { buildSnapshot, startOfLocalDay, type RawUsageEvent, type UsageSnapshotData } from '../../domain/usage';
import { useAppStore } from '../../store/AppStore';
import { appLabel } from './appLabels';

export interface UsageSnapshot extends UsageSnapshotData {
  loading: boolean;
  /** Usage access missing or the query failed: screens show the permissions state instead of zeros. */
  error: boolean;
  refresh: () => Promise<void>;
}

const POLL_MS = 30_000;
const HISTORY_DAYS = 14;

const emptySnapshot = (packages: string[]): UsageSnapshotData =>
  buildSnapshot([], null, packages, Date.now(), appLabel);

const UsageContext = createContext<UsageSnapshot | null>(null);

interface HistoryCache {
  todayStart: number;
  key: string;
  events: RawUsageEvent[];
  historyStartMs: number | null;
}

/**
 * Past days never change, so they are fetched once per day; only today is polled. One provider
 * serves every screen so tabs don't each walk two weeks of events.
 */
export function UsageProvider({ children }: { children: ReactNode }) {
  const { state } = useAppStore();
  const packages = state.settings.trackedPackages;
  const key = packages.join(',');
  const [data, setData] = useState<UsageSnapshotData>(() => emptySnapshot(packages));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const history = useRef<HistoryCache | null>(null);

  const refresh = useCallback(async () => {
    const pkgs = key ? key.split(',') : [];
    const now = Date.now();
    const todayStart = startOfLocalDay(now);
    try {
      if (!UsageStats.isSupported || !UsageStats.hasUsageAccess()) {
        setError(true);
        setData(emptySnapshot(pkgs));
        return;
      }
      if (!history.current || history.current.todayStart !== todayStart || history.current.key !== key) {
        const d = new Date(todayStart);
        const from = new Date(d.getFullYear(), d.getMonth(), d.getDate() - (HISTORY_DAYS - 1)).getTime();
        const past = await UsageStats.getUsageEvents(from, todayStart, pkgs);
        history.current = { todayStart, key, events: past.events, historyStartMs: past.historyStartMs };
      }
      const today = await UsageStats.getUsageEvents(todayStart, now, pkgs);
      setData(buildSnapshot([...history.current.events, ...today.events], history.current.historyStartMs, pkgs, now, appLabel));
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    refresh();
    let timer: ReturnType<typeof setInterval> | null = setInterval(refresh, POLL_MS);
    const sub = RNAppState.addEventListener('change', (next) => {
      if (next === 'active') {
        refresh();
        if (!timer) timer = setInterval(refresh, POLL_MS);
      } else if (timer) {
        clearInterval(timer);
        timer = null;
      }
    });
    return () => {
      if (timer) clearInterval(timer);
      sub.remove();
    };
  }, [refresh]);

  return <UsageContext.Provider value={{ ...data, loading, error, refresh }}>{children}</UsageContext.Provider>;
}

export function useUsageSnapshot(): UsageSnapshot {
  const snapshot = useContext(UsageContext);
  if (!snapshot) throw new Error('useUsageSnapshot must be used inside UsageProvider');
  return snapshot;
}
