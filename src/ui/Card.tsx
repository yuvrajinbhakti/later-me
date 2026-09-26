import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, radius, space } from './theme';

export interface CardProps {
  children: ReactNode;
  elevated?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: ViewStyle;
}

export function Card({ children, elevated, onPress, onLongPress, accessibilityLabel, accessibilityHint, style }: CardProps) {
  const box = [styles.card, elevated && styles.elevated, style];
  if (!onPress) return <View style={box}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [...box, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.l,
    padding: space[4],
  },
  elevated: { backgroundColor: colors.elevated },
  pressed: { transform: [{ scale: 0.985 }], borderColor: colors.muted },
});
