import { useAppStore } from '../../store/AppStore';
import { Screen } from '../../ui/Screen';
import { Text } from '../../ui/Text';
import { TopBar } from '../../ui/TopBar';

export default function QuestsScreen() {
  const { state } = useAppStore();
  return (
    <Screen inTabs header={<TopBar title="Quests" large />}>
      <Text variant="body">{state.quests.length} quests</Text>
    </Screen>
  );
}
