import { router } from 'expo-router';
import { Button } from '../../ui/Button';
import { EmptyState, emptyStateColors } from '../../ui/EmptyState';

export function EmptyQuests() {
  return (
    <EmptyState
      icon="map"
      {...emptyStateColors.accent}
      title="No quest yet"
      body="Name what you are going for, break it into milestones, and the callouts will know what you are skipping."
      action={<Button label="Create a quest" icon="plus" onPress={() => router.push('/create')} />}
    />
  );
}
