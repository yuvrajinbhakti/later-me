import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { permissionNudge, type PermissionKey } from '../../domain/permissions';
import type { SarcasmLevel } from '../../domain/types';
import { Card } from '../../ui/Card';
import { Icon } from '../../ui/Icon';
import { Text } from '../../ui/Text';
import { colors } from '../../ui/theme';
import { usePermissions } from './usePermissions';

export const PERMISSION_NAMES: Record<PermissionKey, string> = {
  usage: 'Usage access',
  overlay: 'Display over other apps',
  notifications: 'Notifications',
  battery: 'Unrestricted battery',
};

/**
 * Shown when the chosen callout style cannot work, or when the battery saver may stop the watcher.
 * Tapping goes straight to the fix.
 */
export function PermissionsBanner({ level, alertsEnabled }: { level: SarcasmLevel; alertsEnabled: boolean }) {
  const perms = usePermissions();
  const nudge = permissionNudge(level, alertsEnabled, perms);
  if (!nudge) return null;

  if (nudge.kind === 'battery') {
    return (
      <Banner
        title="Android may stop the watcher"
        body="Let Later Me run in the background so callouts keep coming. Tap to allow."
        onPress={perms.openBatterySettings}
      />
    );
  }
  const names = nudge.keys.map((m) => PERMISSION_NAMES[m]).join(' and ');
  return (
    <Banner title="Callouts can't reach you" body={`${names} needed. Tap to fix.`} onPress={() => router.push('/accountability')} />
  );
}

function Banner({ title, body, onPress }: { title: string; body: string; onPress: () => void }) {
  return (
    <Card onPress={onPress} accessibilityLabel={`${title}. ${body}`} style={styles.card}>
      <View style={styles.row}>
        <Icon name="alert" size={20} color={colors.warning} />
        <View style={styles.text}>
          <Text variant="label">{title}</Text>
          <Text variant="cap">{body}</Text>
        </View>
        <Icon name="next" size={18} color={colors.muted} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderColor: 'rgba(255,204,102,0.35)', backgroundColor: colors.warnWash, marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  text: { flex: 1, gap: 2 },
});
