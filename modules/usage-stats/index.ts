import { Platform } from 'react-native';
import { requireNativeModule } from 'expo';

export interface WatcherConfig {
  /** Android package names to watch, e.g. ["com.instagram.android"] */
  watchedPackages: string[];
  /** Continuous foreground seconds on a watched app before the overlay fires. */
  thresholdSeconds: number;
  /** Seconds after a dismissal before the overlay may fire again. */
  cooldownSeconds: number;
  /** Short goal label shown on the overlay ("backend engineer by Dec"). */
  goalLabel: string;
}

/**
 * Roast lines by escalation tier: tiers[0] = dry, tiers[1] = pointed,
 * tiers[2] = intervention. Lines may contain {sessionMinutes}, which the
 * native side fills at display time; everything else must be pre-filled.
 */
export type RoastTiers = string[][];

interface NativeUsageStats {
  hasUsageAccess(): boolean;
  openUsageAccessSettings(): void;
  hasOverlayPermission(): boolean;
  openOverlaySettings(): void;
  getUsageToday(packages: string[]): Promise<Record<string, number>>;
  getForegroundApp(): Promise<string | null>;
  startWatcher(configJson: string, roastsJson: string): void;
  stopWatcher(): void;
  isWatcherRunning(): boolean;
  setRoasts(roastsJson: string): void;
  setPausedUntil(epochMs: number): void;
  getPausedUntil(): number;
}

const native: NativeUsageStats | null =
  Platform.OS === 'android' ? requireNativeModule<NativeUsageStats>('UsageStats') : null;

const notAndroid = () => {
  throw new Error('UsageStats is Android-only for now (iOS = Phase 2, Screen Time API).');
};

export const UsageStats = {
  isSupported: native != null,

  hasUsageAccess: (): boolean => (native ? native.hasUsageAccess() : false),
  openUsageAccessSettings: (): void => (native ? native.openUsageAccessSettings() : notAndroid()),
  hasOverlayPermission: (): boolean => (native ? native.hasOverlayPermission() : false),
  openOverlaySettings: (): void => (native ? native.openOverlaySettings() : notAndroid()),

  /** Minutes of foreground time today, keyed by package name. */
  getUsageToday: (packages: string[]): Promise<Record<string, number>> =>
    native ? native.getUsageToday(packages) : Promise.resolve({}),

  getForegroundApp: (): Promise<string | null> =>
    native ? native.getForegroundApp() : Promise.resolve(null),

  startWatcher: (config: WatcherConfig, roasts: RoastTiers): void =>
    native ? native.startWatcher(JSON.stringify(config), JSON.stringify(roasts)) : notAndroid(),
  stopWatcher: (): void => (native ? native.stopWatcher() : notAndroid()),
  isWatcherRunning: (): boolean => (native ? native.isWatcherRunning() : false),

  setRoasts: (roasts: RoastTiers): void =>
    native ? native.setRoasts(JSON.stringify(roasts)) : notAndroid(),

  /** "Not today": silence the watcher until epochMs. Pass 0 to resume. */
  setPausedUntil: (epochMs: number): void =>
    native ? native.setPausedUntil(epochMs) : notAndroid(),
  getPausedUntil: (): number => (native ? native.getPausedUntil() : 0),
};
