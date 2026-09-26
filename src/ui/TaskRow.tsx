import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from './Icon';
import { Text } from './Text';
import { colors, fonts } from './theme';

export interface TaskRowProps {
  label: string;
  meta?: string;
  done: boolean;
  onToggle: () => void;
  last?: boolean;
}

export function TaskRow({ label, meta, done, onToggle, last }: TaskRowProps) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={meta ? `${label}, ${meta}` : label}
      style={[styles.row, last && styles.last]}
    >
      <View style={[styles.check, done && styles.checkOn]}>
        {done ? <Icon name="check" size={14} color={colors.bg} strokeWidth={2.6} /> : null}
      </View>
      <View style={styles.text}>
        <Text style={[styles.label, done && styles.labelDone]}>{label}</Text>
        {meta ? <Text variant="meta" style={styles.meta}>{meta}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 13,
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  last: { borderBottomWidth: 0 },
  check: {
    width: 21,
    height: 21,
    borderRadius: 7,
    marginTop: 1,
    borderWidth: 1.8,
    borderColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.mint, borderColor: colors.mint },
  text: { flex: 1 },
  label: { fontFamily: fonts.medium, fontSize: 14.5, lineHeight: 20, color: colors.text },
  labelDone: { color: colors.muted, textDecorationLine: 'line-through' },
  meta: { marginTop: 2 },
});
