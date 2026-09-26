import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { createQuest, makeId, validateDraft } from '../../domain/quests';
import { blankMilestone, useDraft, type DraftMilestone } from '../../features/create/DraftContext';
import { useAppStore } from '../../store/AppStore';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Icon, type IconName } from '../../ui/Icon';
import { Screen } from '../../ui/Screen';
import { Text } from '../../ui/Text';
import { TopBar } from '../../ui/TopBar';
import { colors, fonts, radius } from '../../ui/theme';

const parseMinutes = (text: string): number | null => {
  const n = parseInt(text.replace(/\D/g, ''), 10);
  return Number.isNaN(n) || n <= 0 ? null : Math.min(n, 600);
};

export default function DefineStepsScreen() {
  const { draft, setMilestones } = useDraft();
  const { dispatch } = useAppStore();
  const [error, setError] = useState<string | null>(null);
  const milestones = draft.milestones;

  const change = (index: number, next: DraftMilestone) => {
    setError(null);
    setMilestones(milestones.map((m, i) => (i === index ? next : m)));
  };
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= milestones.length) return;
    const copy = [...milestones];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    setMilestones(copy);
  };
  const remove = (index: number) => setMilestones(milestones.filter((_, i) => i !== index));

  const onCreate = () => {
    const problem = validateDraft(draft);
    if (problem) {
      setError(problem);
      return;
    }
    const quest = createQuest(draft, new Date(), makeId);
    dispatch({ type: 'addQuest', quest });
    // Replacing the whole create flow means the back button can never re-submit the draft.
    router.replace(`/quest-created/${quest.id}`);
  };

  return (
    <Screen
      header={<TopBar onBack={() => router.back()} title="New quest" subtitle="Step 3 of 3" />}
      footer={
        <View>
          {error ? (
            <Text variant="cap" color={colors.danger} style={styles.error} accessibilityLiveRegion="polite">{error}</Text>
          ) : null}
          <Button label="Create quest" onPress={onCreate} />
        </View>
      }
    >
      <Text variant="hLg" accessibilityRole="header">Break it into milestones</Text>
      <Text variant="body" style={styles.lede}>
        Each milestone is a few concrete tasks. Add minutes where you can: callouts use them to price what scrolling cost.
      </Text>

      {milestones.map((m, mi) => (
        <Card key={mi} style={styles.milestone}>
          <View style={styles.headRow}>
            <Text variant="eyebrow" style={styles.grow}>Milestone {mi + 1}</Text>
            <SmallIcon icon="up" label={`Move milestone ${mi + 1} up`} onPress={() => move(mi, -1)} disabled={mi === 0} />
            <SmallIcon
              icon="down"
              label={`Move milestone ${mi + 1} down`}
              onPress={() => move(mi, 1)}
              disabled={mi === milestones.length - 1}
            />
            <SmallIcon icon="trash" label={`Remove milestone ${mi + 1}`} onPress={() => remove(mi)} disabled={milestones.length === 1} />
          </View>
          <TextInput
            value={m.title}
            onChangeText={(title) => change(mi, { ...m, title })}
            placeholder={mi === 0 ? 'Foundations' : 'Next milestone'}
            placeholderTextColor={colors.muted}
            selectionColor={colors.accent}
            accessibilityLabel={`Milestone ${mi + 1} name`}
            style={styles.milestoneInput}
          />
          {m.tasks.map((t, ti) => (
            <View key={ti} style={styles.taskRow}>
              <TextInput
                value={t.title}
                onChangeText={(title) =>
                  change(mi, { ...m, tasks: m.tasks.map((x, i) => (i === ti ? { ...x, title } : x)) })
                }
                placeholder={ti === 0 ? 'First task' : 'Another task'}
                placeholderTextColor={colors.muted}
                selectionColor={colors.accent}
                accessibilityLabel={`Milestone ${mi + 1}, task ${ti + 1}`}
                style={[styles.input, styles.grow]}
              />
              <TextInput
                value={t.minutes ? String(t.minutes) : ''}
                onChangeText={(text) =>
                  change(mi, { ...m, tasks: m.tasks.map((x, i) => (i === ti ? { ...x, minutes: parseMinutes(text) } : x)) })
                }
                placeholder="min"
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
                accessibilityLabel={`Minutes for task ${ti + 1}`}
                style={[styles.input, styles.minutes]}
              />
              <SmallIcon
                icon="x"
                label={`Remove task ${ti + 1}`}
                onPress={() => change(mi, { ...m, tasks: m.tasks.filter((_, i) => i !== ti) })}
                disabled={m.tasks.length === 1}
              />
            </View>
          ))}
          <Button
            kind="tertiary"
            small
            icon="plus"
            label="Add task"
            onPress={() => change(mi, { ...m, tasks: [...m.tasks, { title: '', minutes: null }] })}
            style={styles.addTask}
          />
        </Card>
      ))}

      <Button kind="secondary" icon="plus" label="Add milestone" onPress={() => setMilestones([...milestones, blankMilestone()])} style={styles.addMilestone} />
    </Screen>
  );
}

function SmallIcon({ icon, label, onPress, disabled }: { icon: IconName; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={4}
      style={[styles.smallIcon, disabled && styles.disabled]}
    >
      <Icon name={icon} size={18} color={colors.text2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  lede: { marginTop: 8, marginBottom: 8 },
  milestone: { marginTop: 16 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 8 },
  grow: { flex: 1 },
  milestoneInput: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    color: colors.text,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 8,
  },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.s,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.regular,
    fontSize: 14.5,
    color: colors.text,
  },
  minutes: { width: 64, textAlign: 'center', fontVariant: ['tabular-nums'] },
  addTask: { alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 4 },
  addMilestone: { marginTop: 16 },
  error: { marginBottom: 10 },
  smallIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.s },
  disabled: { opacity: 0.3 },
});
