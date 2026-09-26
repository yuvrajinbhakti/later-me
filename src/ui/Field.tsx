import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { Text } from './Text';
import { colors, fonts, radius, space } from './theme';

export interface FieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  hint?: string;
  error?: string | null;
  large?: boolean;
}

export function Field({ label, hint, error, large, onFocus, onBlur, ...input }: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        {...input}
        accessibilityLabel={input.accessibilityLabel ?? label}
        placeholderTextColor={colors.muted}
        selectionColor={colors.accent}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[styles.input, large && styles.large, focused && styles.focused, error ? styles.invalid : null]}
      />
      {error ? (
        <Text variant="cap" color={colors.danger} style={styles.hint} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="meta" style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: space[6] },
  label: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, color: colors.text, marginBottom: 8 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.m,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15.5,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  large: { fontSize: 19, fontFamily: fonts.semibold, minHeight: 62, letterSpacing: -0.3 },
  focused: { borderColor: colors.accent, backgroundColor: colors.elevated },
  invalid: { borderColor: colors.danger },
  hint: { marginTop: 7, fontSize: 12.5 },
});
