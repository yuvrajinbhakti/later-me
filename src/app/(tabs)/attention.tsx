import { useAppStore } from '../../store/AppStore';
import { Screen } from '../../ui/Screen';
import { Text } from '../../ui/Text';
import { TopBar } from '../../ui/TopBar';

export default function AttentionScreen() {
  const { state } = useAppStore();
  return (
    <Screen inTabs header={<TopBar title="Your attention" large />}>
      <Text variant="body">Tracking {state.settings.trackedPackages.join(', ')}</Text>
    </Screen>
  );
}
