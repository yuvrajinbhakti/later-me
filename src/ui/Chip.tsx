import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { colors, fonts, radius } from './theme';

type Tone = 'neutral' | 'accent' | 'mint' | 'sarcasm' | 'warn';

const TONE: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: colors.elevated, fg: colors.text2 },
  accent: { bg: colors.accentWash, fg: colors.accent },
  mint: { bg: colors.mintWash, fg: colors.mint },
  sarcasm: { bg: colors.sarcasmWash, fg: colors.sarcasm },
  warn: { bg: colors.warnWash, fg: colors.warning },
};

export function Chip({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const t = TONE[tone];
  return (
    <View style={[styles.chip, { backgroundColor: t.bg }]}>
      <Text style={styles.label} color={t.fg} num>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { alignSelf: 'flex-start', paddingHorizontal: 11, paddingVertical: 5, borderRadius: radius.pill },
  label: { fontFamily: fonts.semibold, fontSize: 12.5, lineHeight: 16 },
});
