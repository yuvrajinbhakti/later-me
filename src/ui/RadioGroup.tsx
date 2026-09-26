import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { colors } from './theme';

export interface RadioOption<T> {
  label: string;
  hint?: string;
  value: T;
}

export interface RadioGroupProps<T> {
  options: RadioOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function RadioGroup<T>({ options, value, onChange }: RadioGroupProps<T>) {
  return (
    <View accessibilityRole="radiogroup">
      {options.map((o, i) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={o.hint ? `${o.label}. ${o.hint}` : o.label}
            style={[styles.row, i === options.length - 1 && styles.last]}
          >
            <View style={[styles.mark, selected && styles.markOn]}>{selected ? <View style={styles.dot} /> : null}</View>
            <View style={styles.text}>
              <Text variant="label">{o.label}</Text>
              {o.hint ? <Text variant="meta" style={styles.hint}>{o.hint}</Text> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  last: { borderBottomWidth: 0 },
  mark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.8,
    borderColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markOn: { borderColor: colors.accent },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
  text: { flex: 1 },
  hint: { marginTop: 2, fontSize: 12.5 },
});
