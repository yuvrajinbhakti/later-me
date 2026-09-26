import { StyleSheet, View } from 'react-native';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { Text } from '../../ui/Text';
import { colors, radius } from '../../ui/theme';
import { usePermissions } from './usePermissions';

/** Full-screen state for when the screen's data depends on usage access. */
export function PermissionsMissing() {
  const perms = usePermissions();
  return (
    <View style={styles.wrap}>
      <View style={styles.icon}>
        <Icon name="eye" size={28} color={colors.warning} />
      </View>
      <Text variant="hSec" style={styles.center}>Usage access is off</Text>
      <Text variant="body" style={[styles.center, styles.body]}>
        Later Me needs it to see how long you spend in tracked apps. It stays on this phone.
      </Text>
      <Button label="Open Usage access settings" onPress={perms.openUsageSettings} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 40 },
  icon: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    backgroundColor: colors.warnWash,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  center: { textAlign: 'center' },
  body: { marginTop: 8, maxWidth: 320 },
  button: { marginTop: 24, alignSelf: 'stretch' },
});
