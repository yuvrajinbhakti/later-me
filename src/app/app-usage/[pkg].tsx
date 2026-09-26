import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { costOfMinutes } from '../../domain/eta';
import { formatMinutes } from '../../domain/format';
import { focusQuest } from '../../domain/quests';
import { startOfLocalDay, twoHourBuckets, weekdayLabels } from '../../domain/usage';
import { appLabel } from '../../features/attention/appLabels';
import { useUsageSnapshot } from '../../features/attention/UsageProvider';
import { useAppStore } from '../../store/AppStore';
import { Card } from '../../ui/Card';
import { Chip } from '../../ui/Chip';
import { Row } from '../../ui/Row';
import { Screen } from '../../ui/Screen';
import { Section } from '../../ui/Section';
import { Text } from '../../ui/Text';
import { TopBar } from '../../ui/TopBar';
import { VBars } from '../../ui/VBars';

const HOUR_LABELS = ['12a', '2a', '4a', '6a', '8a', '10a', '12p', '2p', '4p', '6p', '8p', '10p'];
const hourName = (bucket: number) => {
  const h = bucket * 2;
  const fmt = (x: number) => `${x % 12 === 0 ? 12 : x % 12} ${x < 12 || x === 24 ? 'AM' : 'PM'}`;
  return `${fmt(h)} – ${fmt(h + 2)}`;
};
const DAY_NAMES: Record<string, string> = { Su: 'Sunday', Mo: 'Monday', Tu: 'Tuesday', We: 'Wednesday', Th: 'Thursday', Fr: 'Friday', Sa: 'Saturday' };

export default function AppUsageScreen() {
  const { pkg: raw } = useLocalSearchParams<{ pkg: string }>();
  const pkg = decodeURIComponent(raw ?? '');
  const { state } = useAppStore();
  const usage = useUsageSnapshot();
  const label = appLabel(pkg);
  const app = usage.apps.find((a) => a.pkg === pkg);
  const minutes = app?.minutes ?? 0;
  const buckets = twoHourBuckets(usage.hourly[pkg] ?? []);
  const week = usage.last7[pkg] ?? [];
  const days = weekdayLabels(startOfLocalDay(Date.now()), 7);
  const peakBucket = buckets.indexOf(Math.max(...buckets));
  const worstDay = week.indexOf(Math.max(...week));
  const focus = focusQuest(state);
  const cost = focus ? costOfMinutes(minutes, focus) : null;

  return (
    <Screen header={<TopBar onBack={() => router.back()} title={label} />}>
      <View style={styles.top}>
        <Text variant="display" num>{formatMinutes(minutes)}</Text>
        {app && app.opens > 0 ? <Chip label={`${app.opens} ${app.opens === 1 ? 'open' : 'opens'}`} tone="sarcasm" /> : null}
      </View>
      <Text variant="body" style={styles.sub}>Today</Text>

      <Section title="When">
        <Card>
          <VBars values={buckets} labels={HOUR_LABELS} accessibilityLabel={`Today by two-hour block. Busiest ${hourName(peakBucket)}.`} />
          <Text variant="cap" style={styles.note}>
            {Math.max(...buckets) > 0 ? `Peak: ${hourName(peakBucket)}.` : 'Nothing yet today.'}
          </Text>
        </Card>
      </Section>

      <Section title="Last 7 days">
        <Card>
          <VBars values={week} labels={days} accessibilityLabel={`Last seven days. Worst day ${DAY_NAMES[days[worstDay]] ?? ''}.`} />
          <Text variant="cap" style={styles.note}>
            {Math.max(...week, 0) > 0 ? `Worst day: ${DAY_NAMES[days[worstDay]]}, ${formatMinutes(week[worstDay])}.` : 'No history yet.'}
          </Text>
        </Card>
      </Section>

      <Section title="What it cost">
        <Card elevated>
          {focus && cost ? (
            <>
              {cost.taskEquivalents !== null && cost.taskTitle ? (
                <Row label={`Equivalent in "${cost.taskTitle}"`} right={<Text variant="label" num>{cost.taskEquivalents}×</Text>} />
              ) : null}
              <Row label="Days of your weekly budget" right={<Text variant="label" num>{cost.days}</Text>} />
              <Row label="Focus quest" sublabel={focus.title} last />
            </>
          ) : (
            <Text variant="body">Set a focus quest to see this in quest terms.</Text>
          )}
        </Card>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  sub: { marginTop: 4 },
  note: { marginTop: 14 },
});
