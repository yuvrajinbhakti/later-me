import { Stack } from 'expo-router';
import { DraftProvider } from '../../features/create/DraftContext';
import { colors } from '../../ui/theme';

export default function CreateLayout() {
  return (
    <DraftProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }} />
    </DraftProvider>
  );
}
