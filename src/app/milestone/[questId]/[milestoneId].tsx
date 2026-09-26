import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { formatPercent } from '../../../domain/format';
import { milestoneProgress, milestoneState } from '../../../domain/quests';
import { useTaskToggle } from '../../../features/quests/useTaskToggle';
import { useAppStore } from '../../../store/AppStore';
import { Card } from '../../../ui/Card';
import { Chip } from '../../../ui/Chip';
import { ProgressBar } from '../../../ui/ProgressBar';
import { Screen } from '../../../ui/Screen';
import { TaskRow } from '../../../ui/TaskRow';
import { Text } from '../../../ui/Text';
import { Toast, useToast } from '../../../ui/Toast';
import { TopBar } from '../../../ui/TopBar';

export default function MilestoneDetailScreen() {
  const { questId, milestoneId } = useLocalSearchParams<{ questId: string; milestoneId: string }>();
  const { state } = useAppStore();
  const toast = useToast();
  const toggle = useTaskToggle(toast.show);
  const quest = state.quests.find((q) => q.id === questId);
  const milestone = quest?.milestones.find((m) => m.id === milestoneId);

  if (!quest || !milestone) {
    return (
      <Screen header={<TopBar onBack={() => router.back()} title="Milestone" />}>
        <Text variant="body">This milestone no longer exists.</Text>
      </Screen>
    );
  }

  const pct = milestoneProgress(milestone);
  const done = milestone.tasks.filter((t) => t.done).length;
  const minutesLeft = milestone.tasks.filter((t) => !t.done).reduce((sum, t) => sum + (t.minutes ?? 0), 0);
  const state_ = milestoneState(quest, milestone);

  return (
    <Screen
      header={<TopBar onBack={() => router.back()} title={quest.title} />}
      overlay={<Toast message={toast.message} />}
    >
      {state_ === 'done' ? <Chip label="Done" tone="mint" /> : state_ === 'current' ? <Chip label="You are here" tone="accent" /> : null}
      <Text variant="hLg" style={styles.title} accessibilityRole="header">{milestone.title}</Text>
      <View style={styles.meta}>
        <Text variant="cap" num>{done} of {milestone.tasks.length} done</Text>
        {minutesLeft > 0 ? <Text variant="cap" num>about {minutesLeft} min left</Text> : null}
      </View>
      <ProgressBar value={pct} tone={pct === 1 ? 'mint' : 'accent'} tall accessibilityLabel={`${formatPercent(pct)} percent of this milestone`} />
      <Card style={styles.tasks}>
        {milestone.tasks.map((t, i) => (
          <TaskRow
            key={t.id}
            label={t.title}
            meta={t.minutes ? `${t.minutes} min` : undefined}
            done={t.done}
            onToggle={() => toggle(quest, t.id)}
            last={i === milestone.tasks.length - 1}
          />
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: 10 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, marginBottom: 10 },
  tasks: { marginTop: 20, paddingVertical: 4 },
});
