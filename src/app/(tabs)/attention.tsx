import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { formatMinutes } from '../../domain/format';
import { observationLine } from '../../domain/roasts';
import { weekChange } from '../../domain/usage';
import { limitLabel } from '../../features/attention/AttentionCard';
import { useUsageSnapshot } from '../../features/attention/UsageProvider';
import { PermissionsMissing } from '../../features/permissions/PermissionsMissing';
import { useAppStore } from '../../store/AppStore';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Chip } from '../../ui/Chip';
import { Icon } from '../../ui/Icon';
import { ProgressBar } from '../../ui/ProgressBar';
import { Screen } from '../../ui/Screen';
import { Section } from '../../ui/Section';
import { Text } from '../../ui/Text';
import { IconButton, TopBar } from '../../ui/TopBar';
import { colors, fonts, radius } from '../../ui/theme';

export default function AttentionScreen() {
  const { state } = useAppStore();
  const usage = useUsageSnapshot();
  const limit = state.settings.dailyLimitMinutes;
  const over = limit !== null && usage.totalToday >= limit;
  const topMinutes = Math.max(...usage.apps.map((a) => a.minutes), 1);
  const observation = observationLine(usage.apps);
  const change = weekChange(usage.thisWeek, usage.lastWeek);

  const header = (
    <TopBar
      title="Your attention"
      large
      right={<IconButton icon="settings" label="Accountability settings" onPress={() => router.push('/accountability')} bordered />}
    />
  );

  if (usage.error) {
    return (
      <Screen inTabs header={header}>
        <PermissionsMissing />
      </Screen>
    );
  }

  return (
    <Screen inTabs header={header}>
      <Card elevated>
        <View style={styles.head}>
          <Text variant="eyebrow">Today</Text>
          {over ? <Chip label="Over limit" tone="sarcasm" /> : null}
        </View>
        <Text variant="display" num style={styles.total}>{formatMinutes(usage.totalToday)}</Text>
        <Text variant="cap">across {usage.apps.length} tracked {usage.apps.length === 1 ? 'app' : 'apps'}</Text>
        {limit !== null ? (
          <View style={styles.limitBar}>
            <ProgressBar value={usage.totalToday / limit} tone="sarcasm" accessibilityLabel={`${formatMinutes(usage.totalToday)} of ${formatMinutes(limit)}`} />
          </View>
        ) : null}
        <Text variant="cap" style={styles.limitText}>{limitLabel(limit)}</Text>
      </Card>

      <Section title="Where it went">
        {usage.apps.map((a) => (
          <Pressable
            key={a.pkg}
            onPress={() => router.push(`/app-usage/${encodeURIComponent(a.pkg)}`)}
            accessibilityRole="button"
            accessibilityLabel={`${a.label}: ${formatMinutes(a.minutes)}, ${a.opens} opens today`}
            style={({ pressed }) => [styles.hbar, pressed && styles.pressed]}
          >
            <View style={styles.hbarHead}>
              <Text style={styles.hbarName}>{a.label}</Text>
              <View style={styles.hbarRight}>
                <Text variant="cap" num>{formatMinutes(a.minutes)}</Text>
                <Icon name="next" size={14} color={colors.muted} />
              </View>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${(a.minutes / topMinutes) * 100}%` }]} />
            </View>
          </Pressable>
        ))}
      </Section>

      {observation ? (
        <Section>
          <View style={styles.jab} accessible accessibilityLabel={`Observation. ${observation}`}>
            <Text variant="eyebrow" color={colors.sarcasm}>Observation</Text>
            <Text style={styles.jabLine}>{observation}</Text>
          </View>
        </Section>
      ) : null}

      <Section title="This week vs last">
        <Card>
          {usage.lastWeek === null ? (
            <Text variant="body">
              Not enough history yet. Android keeps about a week of usage, so check back in a few days.
            </Text>
          ) : (
            <>
              <View style={styles.compare}>
                <View style={styles.compareCell}>
                  <Text style={styles.compareVal} color={colors.text2} num>{formatMinutes(usage.lastWeek)}</Text>
                  <Text variant="meta">Last week</Text>
                </View>
                <Icon name={usage.thisWeek <= usage.lastWeek ? 'down' : 'up'} size={20} color={usage.thisWeek <= usage.lastWeek ? colors.mint : colors.sarcasm} />
                <View style={styles.compareCell}>
                  <Text style={styles.compareVal} color={usage.thisWeek <= usage.lastWeek ? colors.mint : colors.sarcasm} num>
                    {formatMinutes(usage.thisWeek)}
                  </Text>
                  <Text variant="meta">This week</Text>
                </View>
              </View>
              {change !== null ? (
                <Text variant="cap" style={styles.changeText} color={change <= 0 ? colors.mint : colors.sarcasm}>
                  {change <= 0 ? `${Math.abs(change)}% less. Keep going and it stops being a fluke.` : `${change}% more than last week.`}
                </Text>
              ) : null}
            </>
          )}
        </Card>
      </Section>

      <Button kind="secondary" label="Adjust accountability" onPress={() => router.push('/accountability')} style={styles.adjust} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 26 },
  total: { marginTop: 8 },
  limitBar: { marginTop: 16 },
  limitText: { marginTop: 8 },
  hbar: { marginBottom: 16 },
  pressed: { opacity: 0.7 },
  hbarHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 },
  hbarName: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  hbarRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.sarcasm },
  jab: {
    padding: 16,
    borderRadius: radius.l,
    backgroundColor: colors.sarcasmWash,
    borderWidth: 1,
    borderColor: 'rgba(255,122,89,0.3)',
  },
  jabLine: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 23, color: colors.text, marginTop: 8 },
  compare: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  compareCell: { alignItems: 'center' },
  compareVal: { fontFamily: fonts.bold, fontSize: 21, lineHeight: 26 },
  changeText: { textAlign: 'center', marginTop: 14 },
  adjust: { marginTop: 24 },
});
