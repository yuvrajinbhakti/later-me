import type { SarcasmLevel } from './types';

export type PermissionKey = 'usage' | 'overlay' | 'notifications';
export type PermissionState = Record<PermissionKey, boolean>;

/**
 * What the chosen callout style cannot work without. Gentle callouts are notifications; normal and
 * savage use the overlay and only fall back to notifications, so those are recommended, not required.
 */
export function missingPermissions(level: SarcasmLevel, perms: PermissionState): PermissionKey[] {
  const required: PermissionKey[] = level === 'gentle' ? ['usage', 'notifications'] : ['usage', 'overlay'];
  return required.filter((key) => !perms[key]);
}
