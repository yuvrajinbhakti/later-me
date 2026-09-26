import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius } from './theme';

export interface ToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
  accessibilityLabel: string;
}

export function Toggle({ value, onChange, accessibilityLabel }: ToggleProps) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={[styles.track, value && styles.trackOn]}
    >
      <View style={[styles.knob, value && styles.knobOn]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 46,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  trackOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.muted, marginLeft: 3 },
  knobOn: { backgroundColor: '#FFFFFF', marginLeft: 21 },
});
