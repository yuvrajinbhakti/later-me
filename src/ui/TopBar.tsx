import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './Icon';
import { Text } from './Text';
import { colors, pad, radius } from './theme';

export interface TopBarProps {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
  large?: boolean;
}

export function TopBar({ title, subtitle, onBack, right, large }: TopBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: insets.top + 10 }]}>
      {onBack ? <IconButton icon="back" label="Back" onPress={onBack} /> : null}
      <View style={styles.titles}>
        {title ? (
          <Text variant={large ? 'hSec' : 'title'} accessibilityRole="header" numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        {subtitle ? <Text variant="cap" style={styles.sub}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  bordered,
}: {
  icon: 'back' | 'settings' | 'more' | 'x' | 'plus' | 'bell';
  label: string;
  onPress: () => void;
  bordered?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={({ pressed }) => [styles.iconBtn, bordered && styles.bordered, pressed && styles.pressed]}
    >
      <Icon name={icon} size={20} color={colors.text2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: pad,
    paddingBottom: 12,
    backgroundColor: colors.bg,
  },
  titles: { flex: 1 },
  sub: { marginTop: 1 },
  iconBtn: { width: 44, height: 44, borderRadius: radius.m, alignItems: 'center', justifyContent: 'center' },
  bordered: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  pressed: { backgroundColor: colors.elevated, transform: [{ scale: 0.94 }] },
});
