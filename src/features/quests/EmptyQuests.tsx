import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { Text } from '../../ui/Text';
import { colors, radius } from '../../ui/theme';

export function EmptyQuests({ title = 'No quest yet', body }: { title?: string; body?: string }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.icon}>
        <Icon name="map" size={28} color={colors.accent} />
      </View>
      <Text variant="hSec" style={styles.center}>{title}</Text>
      <Text variant="body" style={[styles.center, styles.body]}>
        {body ?? 'Name what you are going for, break it into milestones, and the callouts will know what you are skipping.'}
      </Text>
      <Button label="Create a quest" icon="plus" onPress={() => router.push('/create')} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 40 },
  icon: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    backgroundColor: colors.accentWash,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  center: { textAlign: 'center' },
  body: { marginTop: 8, maxWidth: 320 },
  button: { marginTop: 24, alignSelf: 'stretch' },
});
