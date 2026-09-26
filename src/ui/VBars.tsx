import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { colors, fonts } from './theme';

export interface VBarsProps {
  values: number[];
  labels: string[];
  /** Spoken summary, since the bars themselves carry no text. */
  accessibilityLabel: string;
  height?: number;
}

/** Questify's vertical bars: washed accent with a violet cap, the peak filled solid. */
export function VBars({ values, labels, accessibilityLabel, height = 120 }: VBarsProps) {
  const max = Math.max(...values, 0);
  return (
    <View style={[styles.wrap, { height: height + 22 }]} accessible accessibilityLabel={accessibilityLabel}>
      {values.map((v, i) => {
        const peak = max > 0 && v === max;
        const h = max > 0 ? Math.max(4, (v / max) * height) : 4;
        return (
          <View key={i} style={styles.col}>
            <View style={[styles.bar, { height: h }, peak && styles.peak]} />
            <Text style={styles.label} numberOfLines={1}>{labels[i]}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  col: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  bar: {
    width: '100%',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: colors.accentWash,
    borderTopWidth: 2,
    borderTopColor: colors.accent,
  },
  peak: { backgroundColor: colors.accent },
  label: { fontFamily: fonts.semibold, fontSize: 10.5, lineHeight: 13, color: colors.muted },
});
