import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { colors, fonts, radius } from './theme';

export interface SegmentedOption<T> {
  label: string;
  value: T;
  accessibilityLabel?: string;
}

export interface SegmentedProps<T> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function Segmented<T>({ options, value, onChange }: SegmentedProps<T>) {
  return (
    <View style={styles.wrap} accessibilityRole="radiogroup">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={o.accessibilityLabel ?? o.label}
            style={[styles.item, selected && styles.selected]}
          >
            <Text style={styles.label} color={selected ? colors.text : colors.text2} num>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    backgroundColor: colors.elevated,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.border,
  },
  item: { flex: 1, minHeight: 40, borderRadius: radius.s, alignItems: 'center', justifyContent: 'center' },
  selected: { backgroundColor: colors.surface },
  label: { fontFamily: fonts.semibold, fontSize: 13.5, lineHeight: 18 },
});
