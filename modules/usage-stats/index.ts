import { Platform } from 'react-native';
import { requireNativeModule } from 'expo';

export interface WatcherConfig {
  /** Android package names to watch, e.g. ["com.instagram.android"] */
  watchedPackages: string[];
  /** Continuous foreground seconds on a watched app before a callout fires. */
  thresholdSeconds: number;
  /** Seconds between escalating callouts, and after a dismissal. */
  cooldownSeconds: number;
  /** Focus quest title shown on the overlay. */
  goalLabel: string;
  /** gentle = notification; normal / savage = overlay (falls back to a notification without overlay access). */
  sarcasmLevel: 'gentle' | 'normal' | 'savage';
  /** 0 means no daily limit. */
  dailyLimitMinutes: number;
  /** Focus quest's target date at local midnight, for {daysLeft}; 0 with no focus quest. */
  targetDateMs: number;
}

/**
 * tiers[0..2] escalate within a session; limit fires once when the daily limit is crossed.
 * {sessionMinutes}, {todayMinutes} and {daysLeft} are filled natively when a callout fires.
 */
export interface RoastPayload {
  tiers: string[][];
  limit: string[];
}

export interface UsageEventRecord {
  pkg: string;
  type: 'resumed' | 'paused';
  ts: number;
}

export interface UsageEventsResult {
  events: UsageEventRecord[];
  /** Earliest event of any app in the queried range; null when the platform kept nothing. */
  historyStartMs: number | null;
}

interface NativeUsageStats {
  hasUsageAccess(): boolean;
  openUsageAccessSettings(): void;
  hasOverlayPermission(): boolean;
  openOverlaySettings(): void;
  canPostCallouts(): boolean;
  openNotificationSettings(): void;
  getUsageToday(packages: string[]): Promise<Record<string, number>>;
  getUsageEvents(beginMs: number, endMs: number, packages: string[]): Promise<UsageEventsResult>;
  getForegroundApp(): Promise<string | null>;
  startWatcher(configJson: string, roastsJson: string): boolean;
  stopWatcher(): void;
  isWatcherRunning(): boolean;
  hasSavedWatcherConfig(): boolean;
  setRoasts(roastsJson: string): void;
  setPausedUntil(epochMs: number): void;
  getPausedUntil(): number;
}

const native: NativeUsageStats | null =
  Platform.OS === 'android' ? requireNativeModule<NativeUsageStats>('UsageStats') : null;

const notAndroid = () => {
  throw new Error('UsageStats is Android-only for now.');
};

export const UsageStats = {
  isSupported: native != null,

  hasUsageAccess: (): boolean => (native ? native.hasUsageAccess() : false),
  openUsageAccessSettings: (): void => (native ? native.openUsageAccessSettings() : notAndroid()),
  hasOverlayPermission: (): boolean => (native ? native.hasOverlayPermission() : false),
  openOverlaySettings: (): void => (native ? native.openOverlaySettings() : notAndroid()),
  canPostCallouts: (): boolean => (native ? native.canPostCallouts() : false),
  openNotificationSettings: (): void => (native ? native.openNotificationSettings() : notAndroid()),

  /** Minutes of foreground time today, keyed by package name. */
  getUsageToday: (packages: string[]): Promise<Record<string, number>> =>
    native ? native.getUsageToday(packages) : Promise.resolve({}),

  getUsageEvents: (beginMs: number, endMs: number, packages: string[]): Promise<UsageEventsResult> =>
    native ? native.getUsageEvents(beginMs, endMs, packages) : Promise.resolve({ events: [], historyStartMs: null }),

  getForegroundApp: (): Promise<string | null> => (native ? native.getForegroundApp() : Promise.resolve(null)),

  /** false when the platform refused to start the service. */
  startWatcher: (config: WatcherConfig, roasts: RoastPayload): boolean =>
    native ? native.startWatcher(JSON.stringify(config), JSON.stringify(roasts)) : false,
  stopWatcher: (): void => (native ? native.stopWatcher() : undefined),
  isWatcherRunning: (): boolean => (native ? native.isWatcherRunning() : false),
  /** True once startWatcher has ever run on this install, including Phase 1 builds. */
  hasSavedWatcherConfig: (): boolean => (native ? native.hasSavedWatcherConfig() : false),

  setRoasts: (roasts: RoastPayload): void => (native ? native.setRoasts(JSON.stringify(roasts)) : undefined),

  /** "Not today": silence callouts until epochMs. Pass 0 to resume. */
  setPausedUntil: (epochMs: number): void => (native ? native.setPausedUntil(epochMs) : undefined),
  getPausedUntil: (): number => (native ? native.getPausedUntil() : 0),
};
