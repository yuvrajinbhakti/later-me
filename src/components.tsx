import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, ViewStyle } from 'react-native';
import { colors, spacing } from './theme';

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Dim({ children }: { children: React.ReactNode }) {
  return <Text style={styles.dim}>{children}</Text>;
}

export function Field(props: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric';
}) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Label>{props.label}</Label>
      <TextInput
        style={styles.input}
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor={colors.textDim}
        keyboardType={props.keyboardType ?? 'default'}
      />
    </View>
  );
}

export function Button(props: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
}) {
  const kind = props.kind ?? 'primary';
  return (
    <TouchableOpacity
      onPress={props.onPress}
      disabled={props.disabled}
      style={[
        styles.button,
        kind === 'primary' && { backgroundColor: colors.accent },
        kind === 'ghost' && { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
        kind === 'danger' && { backgroundColor: colors.danger },
        props.disabled && { opacity: 0.4 },
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          kind === 'primary' && { color: colors.accentDark },
          kind === 'ghost' && { color: colors.text },
          kind === 'danger' && { color: colors.accentDark },
        ]}
      >
        {props.label}
      </Text>
    </TouchableOpacity>
  );
}

export function StatusPill({ ok, okText, badText }: { ok: boolean; okText: string; badText: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: ok ? '#12351F' : '#3A1A1A' }]}>
      <Text style={{ color: ok ? colors.accent : colors.danger, fontSize: 13, fontWeight: '600' }}>
        {ok ? `● ${okText}` : `○ ${badText}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  title: { color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: spacing.sm },
  label: { color: colors.textDim, fontSize: 13, marginBottom: 4 },
  dim: { color: colors.textDim, fontSize: 13, lineHeight: 18 },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonText: { fontSize: 15, fontWeight: '700' },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
});
