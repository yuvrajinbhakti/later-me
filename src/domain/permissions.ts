import type { SarcasmLevel } from './types';

export type PermissionKey = 'usage' | 'overlay' | 'notifications' | 'battery';
export type PermissionState = Record<PermissionKey, boolean>;

/**
 * What the chosen callout style cannot work without. Gentle callouts are notifications; normal and
 * savage use the overlay and only fall back to notifications, so those are recommended, not required.
 */
export function missingPermissions(level: SarcasmLevel, perms: PermissionState): PermissionKey[] {
  const required: PermissionKey[] = level === 'gentle' ? ['usage', 'notifications'] : ['usage', 'overlay'];
  return required.filter((key) => !perms[key]);
}

export type PermissionNudge = { kind: 'missing'; keys: PermissionKey[] } | { kind: 'battery' } | null;

/**
 * The one permission problem worth surfacing on Home. Battery optimisation never blocks a callout
 * outright, but OEM battery savers kill the watcher silently, so it is suggested once nothing else is
 * missing and only while alerts are on.
 */
export function permissionNudge(level: SarcasmLevel, alertsEnabled: boolean, perms: PermissionState): PermissionNudge {
  const missing = missingPermissions(level, perms);
  if (missing.length > 0) return { kind: 'missing', keys: missing };
  if (alertsEnabled && !perms.battery) return { kind: 'battery' };
  return null;
}
