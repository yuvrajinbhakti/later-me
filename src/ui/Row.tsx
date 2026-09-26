import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { colors } from './theme';

export interface RowProps {
  label: string;
  sublabel?: string;
  icon?: IconName;
  iconColor?: string;
  iconBackground?: string;
  right?: ReactNode;
  onPress?: () => void;
  last?: boolean;
}

export function Row({ label, sublabel, icon, iconColor, iconBackground, right, onPress, last }: RowProps) {
  const content = (
    <>
      {icon ? (
        <View style={[styles.icon, iconBackground ? { backgroundColor: iconBackground } : null]}>
          <Icon name={icon} size={16} color={iconColor ?? colors.text2} />
        </View>
      ) : null}
      <View style={styles.text}>
        <Text variant="label">{label}</Text>
        {sublabel ? <Text variant="meta" style={styles.sub}>{sublabel}</Text> : null}
      </View>
      {right}
    </>
  );
  if (!onPress) return <View style={[styles.row, last && styles.last]}>{content}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={sublabel ? `${label}. ${sublabel}` : label}
      style={({ pressed }) => [styles.row, last && styles.last, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  last: { borderBottomWidth: 0 },
  pressed: { opacity: 0.7 },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1 },
  sub: { marginTop: 2 },
});
