import { focusQuest } from '../../domain/quests';
import { useAppStore } from '../../store/AppStore';
import { Screen } from '../../ui/Screen';
import { Text } from '../../ui/Text';
import { TopBar } from '../../ui/TopBar';

export default function HomeScreen() {
  const { state } = useAppStore();
  const focus = focusQuest(state);
  return (
    <Screen inTabs header={<TopBar title="Later Me" large />}>
      <Text variant="hLg">{focus ? focus.title : 'No quest yet'}</Text>
    </Screen>
  );
}
