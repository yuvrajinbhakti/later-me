import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useDraft } from '../../features/create/DraftContext';
import { Button } from '../../ui/Button';
import { Field } from '../../ui/Field';
import { Screen } from '../../ui/Screen';
import { Section } from '../../ui/Section';
import { Text } from '../../ui/Text';
import { TopBar } from '../../ui/TopBar';
import { colors, fonts, radius } from '../../ui/theme';

const PRESETS = [
  'Become a better frontend engineer',
  'Run a half marathon',
  'Read 12 books this year',
  'Ship a side project',
];

export default function CreateGoalScreen() {
  const { draft, update } = useDraft();
  const canContinue = draft.title.trim() !== '';

  return (
    <Screen
      header={<TopBar onBack={() => router.back()} title="New quest" subtitle="Step 1 of 3" />}
      footer={<Button label="Next" onPress={() => router.push('/create/details')} disabled={!canContinue} />}
    >
      <Text variant="hLg" accessibilityRole="header">What are you going for?</Text>
      <Text variant="body" style={styles.lede}>Say it like an outcome. You can break it down next.</Text>
      <View style={styles.field}>
        <Field
          large
          multiline
          autoFocus
          value={draft.title}
          onChangeText={(title) => update({ title })}
          placeholder="Become a better frontend engineer"
          accessibilityLabel="Goal"
          maxLength={120}
        />
      </View>
      <Section title="Or start from one of these">
        <View style={styles.presets}>
          {PRESETS.map((p) => (
            <Pressable
              key={p}
              onPress={() => update({ title: p })}
              accessibilityRole="button"
              accessibilityLabel={`Use preset: ${p}`}
              style={({ pressed }) => [styles.preset, draft.title === p && styles.presetOn, pressed && styles.pressed]}
            >
              <Text style={styles.presetText} color={draft.title === p ? colors.accent : colors.text2}>{p}</Text>
            </Pressable>
          ))}
        </View>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  lede: { marginTop: 8 },
  field: { marginTop: 24 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -4 },
  preset: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 44,
    justifyContent: 'center',
  },
  presetOn: { borderColor: colors.accent, backgroundColor: colors.accentWash },
  presetText: { fontFamily: fonts.medium, fontSize: 13.5, lineHeight: 18 },
  pressed: { opacity: 0.75 },
});
