import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { currentMilestone, focusQuest, nextTask, questProgress, todayTasks } from '../../domain/quests';
import { formatPercent } from '../../domain/format';
import { AttentionCard } from '../../features/attention/AttentionCard';
import { PermissionsBanner } from '../../features/permissions/PermissionsBanner';
import { EmptyQuests } from '../../features/quests/EmptyQuests';
import { useTaskToggle } from '../../features/quests/useTaskToggle';
import { useAppStore } from '../../store/AppStore';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { ProgressBar } from '../../ui/ProgressBar';
import { Screen } from '../../ui/Screen';
import { Section } from '../../ui/Section';
import { TaskRow } from '../../ui/TaskRow';
import { Text } from '../../ui/Text';
import { Toast, useToast } from '../../ui/Toast';
import { IconButton, TopBar } from '../../ui/TopBar';
import { colors } from '../../ui/theme';

function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 5) return 'Up late';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const { state, dispatch } = useAppStore();
  const toast = useToast();
  const toggle = useTaskToggle(toast.show);
  const focus = focusQuest(state);
  const next = focus ? nextTask(focus) : null;
  const milestone = focus ? currentMilestone(focus) : null;
  const today = focus ? todayTasks(focus) : [];
  const progress = focus ? questProgress(focus) : 0;

  const header = (
    <TopBar
      title={greeting(new Date())}
      subtitle={next ? `Next move: ${next.title}` : focus ? 'Every task is ticked.' : undefined}
      large
      right={<IconButton icon="settings" label="Accountability settings" onPress={() => router.push('/accountability')} bordered />}
    />
  );

  return (
    <Screen inTabs header={header} overlay={<Toast message={toast.message} aboveTabs />}>
      <PermissionsBanner level={state.settings.sarcasmLevel} />

      {state.quests.length === 0 ? (
        <EmptyQuests />
      ) : !focus ? (
        <Card onPress={() => router.push('/quests')} accessibilityLabel="No quest in focus. Choose one in Quests">
          <Text variant="title">No quest in focus</Text>
          <Text variant="body" style={styles.gap}>Pick one in Quests so callouts know what you're skipping.</Text>
        </Card>
      ) : (
        <>
          <Card elevated>
            <View style={styles.headRow}>
              <Text variant="eyebrow" color={colors.accent}>Focus quest</Text>
              <Text variant="cap" num>{formatPercent(progress)}%</Text>
            </View>
            <Text variant="hSec" style={styles.title}>{focus.title}</Text>
            <ProgressBar value={progress} tall accessibilityLabel={`${formatPercent(progress)} percent complete`} />
            {milestone ? (
              <View style={styles.nextRow}>
                <View style={styles.grow}>
                  <Text variant="cap">Next milestone</Text>
                  <Text variant="label" numberOfLines={2}>{milestone.title}</Text>
                </View>
                <Button small label="Continue" onPress={() => router.push(`/milestone/${focus.id}/${milestone.id}`)} />
              </View>
            ) : (
              <View style={styles.nextRow}>
                <Text variant="label" style={styles.grow}>Every milestone is done.</Text>
                <Button
                  small
                  kind="secondary"
                  label="Mark complete"
                  onPress={() => dispatch({ type: 'setStatus', questId: focus.id, status: 'completed' })}
                />
              </View>
            )}
          </Card>

          {today.length > 0 ? (
            <Section
              title="Today"
              right={<Text variant="cap" num>{milestone ? `${milestone.tasks.filter((t) => !t.done).length} left in milestone` : ''}</Text>}
            >
              <Card>
                {today.map((t, i) => (
                  <TaskRow
                    key={t.id}
                    label={t.title}
                    meta={t.minutes ? `${t.minutes} min` : undefined}
                    done={t.done}
                    onToggle={() => toggle(focus, t.id)}
                    last={i === today.length - 1}
                  />
                ))}
              </Card>
            </Section>
          ) : null}
        </>
      )}

      {state.quests.length > 0 ? (
        <Section>
          <AttentionCard limit={state.settings.dailyLimitMinutes} />
        </Section>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { marginTop: 6 },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { marginTop: 8, marginBottom: 14 },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  grow: { flex: 1, gap: 2 },
});
