import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { nextTask } from '../../domain/quests';
import { useAppStore } from '../../store/AppStore';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Icon } from '../../ui/Icon';
import { Screen } from '../../ui/Screen';
import { Text } from '../../ui/Text';
import { TopBar } from '../../ui/TopBar';
import { colors, radius } from '../../ui/theme';

export default function QuestCreatedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useAppStore();
  const quest = state.quests.find((q) => q.id === id);
  const first = quest ? nextTask(quest) : null;
  const isFocus = state.focusQuestId === id;

  return (
    <Screen
      header={<TopBar />}
      footer={
        <View style={styles.actions}>
          <Button label="View roadmap" onPress={() => router.replace(`/quest/${id}`)} />
          <Button kind="tertiary" label="Go home" onPress={() => router.dismissTo('/')} />
        </View>
      }
    >
      <View style={styles.badge}>
        <Icon name="check" size={30} color={colors.mint} strokeWidth={2.4} />
      </View>
      <Text variant="eyebrow" color={colors.mint}>Quest created</Text>
      <Text variant="hLg" style={styles.title} accessibilityRole="header">{quest?.title ?? 'Your quest'}</Text>
      <Text variant="body" style={styles.lede}>
        {isFocus
          ? 'It is your focus quest, so callouts will name it from now on.'
          : 'It is saved. Set it as your focus from Quests when you want callouts to name it.'}
      </Text>
      {first ? (
        <Card elevated style={styles.first}>
          <Text variant="eyebrow" color={colors.accent}>Your first move</Text>
          <Text variant="title" style={styles.firstTitle}>{first.title}</Text>
          {first.minutes ? <Text variant="cap" num>{first.minutes} minutes</Text> : null}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    backgroundColor: colors.mintWash,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  title: { marginTop: 8 },
  lede: { marginTop: 10 },
  first: { marginTop: 28 },
  firstTitle: { marginTop: 8, marginBottom: 4 },
  actions: { gap: 4 },
});
