import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { colors, radius } from './theme';

export interface EmptyStateProps {
  icon: IconName;
  tint: string;
  wash: string;
  title: string;
  body: string;
  action: ReactNode;
}

export function EmptyState({ icon, tint, wash, title, body, action }: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.icon, { backgroundColor: wash }]}>
        <Icon name={icon} size={28} color={tint} />
      </View>
      <Text variant="hSec" style={styles.center}>{title}</Text>
      <Text variant="body" style={[styles.center, styles.body]}>{body}</Text>
      <View style={styles.action}>{action}</View>
    </View>
  );
}

export const emptyStateColors = { accent: { tint: colors.accent, wash: colors.accentWash }, warning: { tint: colors.warning, wash: colors.warnWash } };

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 40 },
  icon: { width: 64, height: 64, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  center: { textAlign: 'center' },
  body: { marginTop: 8, maxWidth: 320 },
  action: { marginTop: 24, alignSelf: 'stretch' },
});
