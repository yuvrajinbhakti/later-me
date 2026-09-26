import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { formatMinutes } from '../../domain/format';
import type { DailyLimit } from '../../domain/types';
import { Card } from '../../ui/Card';
import { Chip } from '../../ui/Chip';
import { ProgressBar } from '../../ui/ProgressBar';
import { Text } from '../../ui/Text';
import { useUsageSnapshot } from './UsageProvider';

export const limitLabel = (limit: DailyLimit) => (limit === null ? 'No daily limit' : `Daily limit ${formatMinutes(limit)}`);

export function AttentionCard({ limit }: { limit: DailyLimit }) {
  const usage = useUsageSnapshot();
  if (usage.error) return null;
  const over = limit !== null && usage.totalToday >= limit;
  return (
    <Card
      onPress={() => router.push('/attention')}
      accessibilityLabel={`Attention today: ${formatMinutes(usage.totalToday)} in tracked apps. ${limitLabel(limit)}.${over ? ' Over limit.' : ''}`}
    >
      <View style={styles.head}>
        <Text variant="eyebrow">Attention today</Text>
        {over ? <Chip label="Over limit" tone="sarcasm" /> : null}
      </View>
      <Text variant="hSec" num style={styles.total}>{formatMinutes(usage.totalToday)}</Text>
      {limit !== null ? <ProgressBar value={usage.totalToday / limit} tone="sarcasm" /> : null}
      <Text variant="cap" style={styles.cap}>{limitLabel(limit)} · tracked apps</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 26 },
  total: { marginTop: 6, marginBottom: 12 },
  cap: { marginTop: 8 },
});
