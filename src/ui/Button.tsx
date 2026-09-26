import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { colors, fonts, radius } from './theme';

type Kind = 'primary' | 'secondary' | 'tertiary' | 'danger';

const KIND: Record<Kind, { box: ViewStyle; text: string }> = {
  primary: { box: { backgroundColor: colors.accent }, text: colors.onAccent },
  secondary: { box: { backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.border }, text: colors.text },
  tertiary: { box: { backgroundColor: 'transparent' }, text: colors.text2 },
  danger: { box: { backgroundColor: colors.dangerWash, borderWidth: 1, borderColor: 'rgba(255,107,129,0.3)' }, text: colors.danger },
};

export interface ButtonProps {
  label: string;
  onPress: () => void;
  kind?: Kind;
  small?: boolean;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  accessibilityHint?: string;
}

export function Button({ label, onPress, kind = 'primary', small, icon, disabled, loading, style, accessibilityHint }: ButtonProps) {
  const k = KIND[kind];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        small && styles.small,
        k.box,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={k.text} />
      ) : (
        <View style={styles.inner}>
          {icon ? <Icon name={icon} size={small ? 16 : 18} color={k.text} /> : null}
          <Text style={[styles.label, small && styles.labelSmall]} color={k.text} numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 48, paddingHorizontal: 20, borderRadius: radius.m, alignItems: 'center', justifyContent: 'center' },
  small: { minHeight: 38, paddingHorizontal: 14, borderRadius: radius.s },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  // No negative letterSpacing: Android under-measures it on custom fonts and clips auto-sized buttons.
  label: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20 },
  labelSmall: { fontSize: 13.5 },
  disabled: { opacity: 0.38 },
  pressed: { transform: [{ scale: 0.975 }] },
});
