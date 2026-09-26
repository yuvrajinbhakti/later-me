import { Button } from '../../ui/Button';
import { EmptyState, emptyStateColors } from '../../ui/EmptyState';
import { usePermissions } from './usePermissions';

/** Full-screen state for when the screen's data depends on usage access. */
export function PermissionsMissing() {
  const perms = usePermissions();
  return (
    <EmptyState
      icon="eye"
      {...emptyStateColors.warning}
      title="Usage access is off"
      body="Later Me needs it to see how long you spend in tracked apps. It stays on this phone."
      action={<Button label="Open Usage access settings" onPress={perms.openUsageSettings} />}
    />
  );
}
