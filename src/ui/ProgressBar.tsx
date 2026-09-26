import { StyleSheet, View } from 'react-native';
import { colors, radius } from './theme';

export interface ProgressBarProps {
  /** 0..1; values outside are clamped. */
  value: number;
  tone?: 'accent' | 'mint' | 'sarcasm';
  tall?: boolean;
  accessibilityLabel?: string;
}

export function ProgressBar({ value, tone = 'accent', tall, accessibilityLabel }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View
      style={[styles.track, tall && styles.tall]}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
    >
      <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: colors[tone] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 6, borderRadius: radius.pill, backgroundColor: colors.elevated, overflow: 'hidden' },
  tall: { height: 8 },
  fill: { height: '100%', borderRadius: radius.pill },
});
