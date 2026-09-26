import { useCallback, useEffect, useState } from 'react';
import { AppState as RNAppState, PermissionsAndroid, Platform } from 'react-native';
import { UsageStats } from '../../../modules/usage-stats';
import type { PermissionState } from '../../domain/permissions';

const read = (): PermissionState => ({
  usage: UsageStats.hasUsageAccess(),
  overlay: UsageStats.hasOverlayPermission(),
  notifications: UsageStats.canPostCallouts(),
});

/** Re-reads whenever the app returns to the foreground, i.e. after a trip to Settings. */
export function usePermissions() {
  const [perms, setPerms] = useState<PermissionState>(read);
  const refresh = useCallback(() => setPerms(read()), []);

  useEffect(() => {
    const sub = RNAppState.addEventListener('change', (next) => {
      if (next === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  /** Runtime prompt only exists from Android 13; below that, or once blocked, only Settings can help. */
  const requestNotifications = useCallback(async () => {
    if (Platform.OS !== 'android') return;
    if (typeof Platform.Version === 'number' && Platform.Version >= 33) {
      const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) UsageStats.openNotificationSettings();
    } else {
      UsageStats.openNotificationSettings();
    }
    refresh();
  }, [refresh]);

  return {
    ...perms,
    requestNotifications,
    openUsageSettings: UsageStats.openUsageAccessSettings,
    openOverlaySettings: UsageStats.openOverlaySettings,
  };
}
