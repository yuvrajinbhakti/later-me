import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { projectQuest } from '../../domain/eta';
import { formatDate, formatPercent, parseLocalDate } from '../../domain/format';
import { currentMilestone, milestoneState, questProgress } from '../../domain/quests';
import { QuestOptionsSheet } from '../../features/quests/QuestOptionsSheet';
import { useAppStore } from '../../store/AppStore';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Chip } from '../../ui/Chip';
import { ProgressBar } from '../../ui/ProgressBar';
import { Screen } from '../../ui/Screen';
import { Section } from '../../ui/Section';
import { Spine, type SpineNode } from '../../ui/Spine';
import { Text } from '../../ui/Text';
import { IconButton, TopBar } from '../../ui/TopBar';
import { colors, radius } from '../../ui/theme';

export default function QuestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useAppStore();
  const [optionsOpen, setOptionsOpen] = useState(false);
  const quest = state.quests.find((q) => q.id === id);

  if (!quest) {
    return (
      <Screen header={<TopBar onBack={() => router.back()} title="Quest" />}>
        <Text variant="body">This quest no longer exists.</Text>
      </Screen>
    );
  }

  const pct = questProgress(quest);
  const eta = projectQuest(quest, new Date());
  const current = currentMilestone(quest);
  const slipping = !eta.projectedDate || eta.slipDays > 0;
  const doneMilestones = quest.milestones.filter((m) => milestoneState(quest, m) === 'done').length;
  const nodes: SpineNode[] = quest.milestones.map((m) => {
    const state = milestoneState(quest, m);
    const done = m.tasks.filter((t) => t.done).length;
    return {
      id: m.id,
      title: m.title,
      state,
      meta: state === 'done' ? `All ${m.tasks.length} tasks done` : state === 'current' ? `${done} of ${m.tasks.length} tasks` : `${m.tasks.length} tasks`,
    };
  });

  return (
    <Screen
      header={
        <TopBar
          onBack={() => router.back()}
          title="Quest"
          right={<IconButton icon="more" label="Quest options" onPress={() => setOptionsOpen(true)} />}
        />
      }
      footer={
        current && quest.status === 'active' ? (
          <Button label="Continue quest" onPress={() => router.push(`/milestone/${quest.id}/${current.id}`)} />
        ) : undefined
      }
      overlay={
        <QuestOptionsSheet quest={optionsOpen ? quest : null} onClose={() => setOptionsOpen(false)} onDeleted={() => router.back()} />
      }
    >
      <View style={styles.titleRow}>
        <Text variant="hLg" style={styles.grow} accessibilityRole="header">{quest.title}</Text>
      </View>
      {quest.status !== 'active' ? (
        <View style={styles.status}>
          <Chip label={quest.status === 'paused' ? 'Paused' : 'Completed'} tone={quest.status === 'completed' ? 'mint' : 'neutral'} />
        </View>
      ) : null}

      <View style={styles.bigRow}>
        <Text variant="display" num>{formatPercent(pct)}</Text>
        <Text variant="hSec" color={colors.text2} style={styles.pctSign}>%</Text>
        <Text variant="cap" style={styles.complete}>complete</Text>
      </View>
      <ProgressBar value={pct} tall accessibilityLabel={`${formatPercent(pct)} percent complete`} />

      <View style={styles.stats}>
        <Stat label="Due" value={formatDate(parseLocalDate(quest.targetDate))} />
        <Stat
          label={eta.slipDays > 0 ? `Projected · ${eta.slipDays} days late` : 'Projected'}
          value={formatDate(eta.projectedDate)}
          color={slipping ? colors.danger : colors.mint}
        />
      </View>

      {quest.why ? (
        <Card elevated style={styles.why}>
          <Text variant="eyebrow">Why this matters</Text>
          <Text variant="label" style={styles.whyText}>{quest.why}</Text>
        </Card>
      ) : null}

      <Section title="The journey" right={<Text variant="cap" num>{doneMilestones} of {quest.milestones.length}</Text>}>
        <Spine nodes={nodes} onPress={(mid) => router.push(`/milestone/${quest.id}/${mid}`)} />
      </Section>
    </Screen>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text variant="cap">{label}</Text>
      <Text variant="label" num color={color} style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row' },
  grow: { flex: 1 },
  status: { marginTop: 10 },
  bigRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 20, marginBottom: 12 },
  pctSign: { marginLeft: 2 },
  complete: { marginLeft: 10 },
  stats: { flexDirection: 'row', gap: 10, marginTop: 18 },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.m,
    padding: 14,
  },
  statValue: { marginTop: 4 },
  why: { marginTop: 18 },
  whyText: { marginTop: 8, lineHeight: 22 },
});
