import { UsageStats, type RoastPayload, type WatcherConfig } from '../../modules/usage-stats';
import { parseLocalDate } from '../domain/format';
import { focusQuest } from '../domain/quests';
import { buildRoastPools } from '../domain/roasts';
import type { AppState } from '../domain/types';

export function buildWatcherConfig(s: AppState): WatcherConfig {
  const focus = focusQuest(s);
  return {
    watchedPackages: s.settings.trackedPackages,
    thresholdSeconds: s.settings.alertAfterMinutes * 60,
    cooldownSeconds: s.settings.sarcasmLevel === 'savage' ? 60 : 120,
    goalLabel: focus?.title ?? '',
    sarcasmLevel: s.settings.sarcasmLevel,
    dailyLimitMinutes: s.settings.dailyLimitMinutes ?? 0,
    targetDateMs: focus ? parseLocalDate(focus.targetDate).getTime() : 0,
  };
}

export type SyncAction = 'stop' | 'start' | 'roasts' | 'none';

export function planSync(input: {
  alertsEnabled: boolean;
  usageAccess: boolean;
  running: boolean;
  configKey: string;
  lastConfigKey: string | null;
  roastsKey: string;
  lastRoastsKey: string | null;
}): SyncAction {
  if (!input.alertsEnabled) return input.running ? 'stop' : 'none';
  if (!input.usageAccess) return 'none';
  if (!input.running || input.configKey !== input.lastConfigKey) return 'start';
  if (input.roastsKey !== input.lastRoastsKey) return 'roasts';
  return 'none';
}

export interface WatcherNative {
  hasUsageAccess(): boolean;
  isWatcherRunning(): boolean;
  startWatcher(config: WatcherConfig, roasts: RoastPayload): boolean;
  stopWatcher(): void;
  setRoasts(roasts: RoastPayload): void;
}

/** Remembers what was last pushed so ticking a task never restarts the service. */
export function createWatcherSync(native: WatcherNative) {
  let lastConfigKey: string | null = null;
  let lastRoastsKey: string | null = null;

  return function sync(s: AppState): { action: SyncAction; ok: boolean } {
    const config = buildWatcherConfig(s);
    const pools = buildRoastPools(s.settings.sarcasmLevel, focusQuest(s), s.settings.aiCallouts ? s.aiCallouts : null);
    const configKey = JSON.stringify(config);
    const roastsKey = JSON.stringify(pools);
    const action = planSync({
      alertsEnabled: s.settings.alertsEnabled,
      usageAccess: native.hasUsageAccess(),
      running: native.isWatcherRunning(),
      configKey,
      lastConfigKey,
      roastsKey,
      lastRoastsKey,
    });

    switch (action) {
      case 'stop':
        native.stopWatcher();
        lastConfigKey = null;
        lastRoastsKey = null;
        return { action, ok: true };
      case 'start': {
        const ok = native.startWatcher(config, pools);
        lastConfigKey = ok ? configKey : null;
        lastRoastsKey = ok ? roastsKey : null;
        return { action, ok };
      }
      case 'roasts':
        native.setRoasts(pools);
        lastRoastsKey = roastsKey;
        return { action, ok: true };
      default:
        return { action, ok: true };
    }
  };
}

export const syncWatcher = createWatcherSync(UsageStats);
