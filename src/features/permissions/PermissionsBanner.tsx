import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { missingPermissions, type PermissionKey } from '../../domain/permissions';
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
};

/** Shown only when the chosen callout style cannot work; tapping goes to the fix. */
export function PermissionsBanner({ level }: { level: SarcasmLevel }) {
  const perms = usePermissions();
  const missing = missingPermissions(level, perms);
  if (missing.length === 0) return null;
  const names = missing.map((m) => PERMISSION_NAMES[m]).join(' and ');
  return (
    <Card onPress={() => router.push('/accountability')} accessibilityLabel={`Callouts can't reach you. ${names} needed. Fix it`} style={styles.card}>
      <View style={styles.row}>
        <Icon name="alert" size={20} color={colors.warning} />
        <View style={styles.text}>
          <Text variant="label">Callouts can't reach you</Text>
          <Text variant="cap">{names} needed. Tap to fix.</Text>
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
