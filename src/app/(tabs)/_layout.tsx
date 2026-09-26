import { Tabs } from 'expo-router';
import { TabBar } from '../../ui/TabBar';
import { colors } from '../../ui/theme';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="quests" options={{ title: 'Quests' }} />
      <Tabs.Screen name="attention" options={{ title: 'Attention' }} />
    </Tabs>
  );
}
