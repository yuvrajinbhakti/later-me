import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { dayStartOffset, formatDate, monthsFromNow, parseLocalDate, toLocalYmd } from '../../domain/format';
import { useDraft } from '../../features/create/DraftContext';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Field } from '../../ui/Field';
import { Icon } from '../../ui/Icon';
import { Screen } from '../../ui/Screen';
import { Section } from '../../ui/Section';
import { Text } from '../../ui/Text';
import { TopBar } from '../../ui/TopBar';
import { colors, fonts, radius } from '../../ui/theme';

const QUICK = [
  { label: '+1 month', months: 1 },
  { label: '+3 months', months: 3 },
  { label: '+6 months', months: 6 },
];

export default function GoalDetailsScreen() {
  const { draft, update } = useDraft();
  const target = parseLocalDate(draft.targetDate);

  const pickDate = () => {
    DateTimePickerAndroid.open({
      value: target,
      mode: 'date',
      minimumDate: new Date(dayStartOffset(Date.now(), 1)),
      onValueChange: (_event, date) => update({ targetDate: toLocalYmd(date) }),
    });
  };

  const setHours = (h: number) => update({ hoursPerWeek: Math.max(1, Math.min(40, h)) });

  return (
    <Screen
      header={<TopBar onBack={() => router.back()} title="New quest" subtitle="Step 2 of 3" />}
      footer={<Button label="Next" onPress={() => router.push('/create/steps')} />}
    >
      <Text variant="hLg" accessibilityRole="header" numberOfLines={3}>{draft.title}</Text>

      <Section title="Why it matters">
        <Field
          multiline
          value={draft.why}
          onChangeText={(why) => update({ why })}
          placeholder="Because I told three people I would."
          hint="The line you'll read when motivation runs out. Optional."
          accessibilityLabel="Why it matters"
          maxLength={200}
        />
      </Section>

      <Section title="Target date">
        <Card onPress={pickDate} accessibilityLabel={`Target date ${formatDate(target)}. Change`}>
          <View style={styles.dateRow}>
            <Icon name="calendar" size={20} color={colors.text2} />
            <Text variant="label" style={styles.grow} num>{formatDate(target)}</Text>
            <Text variant="link">Change</Text>
          </View>
        </Card>
        <View style={styles.quick}>
          {QUICK.map((q) => {
            const selected = draft.targetDate === monthsFromNow(new Date(), q.months);
            return (
              <Pressable
                key={q.label}
                onPress={() => update({ targetDate: monthsFromNow(new Date(), q.months) })}
                accessibilityRole="button"
                accessibilityLabel={`Target ${q.label}`}
                style={[styles.chip, selected && styles.chipOn]}
              >
                <Text style={styles.chipText} color={selected ? colors.accent : colors.text2}>{q.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section title="Hours per week">
        <View style={styles.stepper}>
          <StepButton label="Fewer hours" symbol="−" onPress={() => setHours(draft.hoursPerWeek - 1)} />
          <View style={styles.stepValue} accessibilityLiveRegion="polite">
            <Text variant="display" num>{draft.hoursPerWeek}</Text>
            <Text variant="cap">hours a week, honestly</Text>
          </View>
          <StepButton label="More hours" symbol="+" onPress={() => setHours(draft.hoursPerWeek + 1)} />
        </View>
      </Section>
    </Screen>
  );
}

function StepButton({ label, symbol, onPress }: { label: string; symbol: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.stepBtn, pressed && styles.pressed]}
    >
      <Text style={styles.stepSymbol}>{symbol}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  grow: { flex: 1 },
  quick: { flexDirection: 'row', gap: 8, marginTop: 12 },
  chip: {
    paddingHorizontal: 14,
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { borderColor: colors.accent, backgroundColor: colors.accentWash },
  chipText: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 17 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepValue: { alignItems: 'center' },
  stepBtn: {
    width: 56,
    height: 56,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepSymbol: { fontFamily: fonts.semibold, fontSize: 26, lineHeight: 30, color: colors.text },
  pressed: { opacity: 0.7 },
});
