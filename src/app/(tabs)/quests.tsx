import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatDate, formatPercent, parseLocalDate } from '../../domain/format';
import { questProgress } from '../../domain/quests';
import type { Quest, QuestStatus } from '../../domain/types';
import { EmptyQuests } from '../../features/quests/EmptyQuests';
import { QuestOptionsSheet } from '../../features/quests/QuestOptionsSheet';
import { useAppStore } from '../../store/AppStore';
import { Card } from '../../ui/Card';
import { Chip } from '../../ui/Chip';
import { Icon } from '../../ui/Icon';
import { ProgressBar } from '../../ui/ProgressBar';
import { Screen } from '../../ui/Screen';
import { Segmented } from '../../ui/Segmented';
import { Text } from '../../ui/Text';
import { TopBar } from '../../ui/TopBar';
import { colors, navHeight, pad } from '../../ui/theme';

const EMPTY_COPY: Record<QuestStatus, string> = {
  active: 'Nothing active. Resume a paused quest or start a new one.',
  paused: 'No paused quests.',
  completed: 'Nothing finished yet. Soon.',
};

export default function QuestsScreen() {
  const { state } = useAppStore();
  const insets = useSafeAreaInsets();
  const [segment, setSegment] = useState<QuestStatus>('active');
  const [options, setOptions] = useState<Quest | null>(null);
  const count = (s: QuestStatus) => state.quests.filter((q) => q.status === s).length;
  const visible = state.quests.filter((q) => q.status === segment);

  const fab = (
    <Pressable
      onPress={() => router.push('/create')}
      accessibilityRole="button"
      accessibilityLabel="Create a quest"
      style={({ pressed }) => [styles.fab, { bottom: navHeight + insets.bottom + 20 }, pressed && styles.pressed]}
    >
      <Icon name="plus" size={24} color={colors.onAccent} strokeWidth={2.2} />
    </Pressable>
  );

  return (
    <Screen
      inTabs
      header={<TopBar title="Quests" large />}
      overlay={
        <>
          {state.quests.length > 0 ? fab : null}
          <QuestOptionsSheet quest={options} onClose={() => setOptions(null)} />
        </>
      }
    >
      {state.quests.length === 0 ? (
        <EmptyQuests />
      ) : (
        <>
          <Segmented
            value={segment}
            onChange={setSegment}
            options={[
              { label: `Active ${count('active')}`, value: 'active', accessibilityLabel: `Active, ${count('active')}` },
              { label: `Paused ${count('paused')}`, value: 'paused', accessibilityLabel: `Paused, ${count('paused')}` },
              { label: `Done ${count('completed')}`, value: 'completed', accessibilityLabel: `Completed, ${count('completed')}` },
            ]}
          />
          <View style={styles.list}>
            {visible.length === 0 ? <Text variant="body" style={styles.empty}>{EMPTY_COPY[segment]}</Text> : null}
            {visible.map((q) => {
              const pct = questProgress(q);
              const isFocus = state.focusQuestId === q.id;
              return (
                <Card
                  key={q.id}
                  onPress={() => router.push(`/quest/${q.id}`)}
                  onLongPress={() => setOptions(q)}
                  accessibilityLabel={`${q.title}. ${formatPercent(pct)} percent.${isFocus ? ' Focus quest.' : ''}`}
                  accessibilityHint="Long press for options"
                >
                  <View style={styles.rowTop}>
                    <Text variant="title" style={styles.grow} numberOfLines={2}>{q.title}</Text>
                    {isFocus ? <Chip label="Focus" tone="accent" /> : null}
                    <Pressable
                      onPress={() => setOptions(q)}
                      accessibilityRole="button"
                      accessibilityLabel={`Options for ${q.title}`}
                      hitSlop={8}
                      style={styles.more}
                    >
                      <Icon name="more" size={20} color={colors.muted} />
                    </Pressable>
                  </View>
                  <Text variant="cap" style={styles.due}>
                    {q.status === 'completed' && q.completedAt
                      ? `Completed ${formatDate(new Date(q.completedAt))}`
                      : `Due ${formatDate(parseLocalDate(q.targetDate))}`}
                  </Text>
                  <View style={styles.progressRow}>
                    <View style={styles.grow}>
                      <ProgressBar value={pct} tone={q.status === 'completed' ? 'mint' : 'accent'} />
                    </View>
                    <Text variant="cap" num style={styles.pct}>{formatPercent(pct)}%</Text>
                  </View>
                </Card>
              );
            })}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: 16, gap: 12 },
  empty: { textAlign: 'center', marginTop: 24 },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  grow: { flex: 1 },
  more: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginTop: -4, marginRight: -6 },
  due: { marginTop: 4 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  pct: { minWidth: 38, textAlign: 'right', color: colors.text },
  fab: {
    position: 'absolute',
    right: pad,
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: colors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 14,
  },
  pressed: { transform: [{ scale: 0.94 }] },
});
