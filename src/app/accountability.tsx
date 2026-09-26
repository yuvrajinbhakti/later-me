import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { UsageStats } from '../../modules/usage-stats';
import { dayStartOffset, formatClock, formatMinutes } from '../domain/format';
import { focusQuest } from '../domain/quests';
import { previewLine } from '../domain/roasts';
import {
  ALERT_AFTER_OPTIONS,
  DAILY_LIMIT_OPTIONS,
  DEV_ALERT_AFTER_OPTIONS,
  DEV_DAILY_LIMIT_OPTIONS,
  type AccountabilitySettings,
  type AlertAfter,
  type DailyLimit,
  type SarcasmLevel,
} from '../domain/types';
import { KNOWN_APPS, appLabel } from '../features/attention/appLabels';
import { PERMISSION_NAMES } from '../features/permissions/PermissionsBanner';
import { usePermissions } from '../features/permissions/usePermissions';
import { useAppStore } from '../store/AppStore';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Chip } from '../ui/Chip';
import { Field } from '../ui/Field';
import { Icon } from '../ui/Icon';
import { RadioGroup } from '../ui/RadioGroup';
import { Row } from '../ui/Row';
import { Screen } from '../ui/Screen';
import { Section } from '../ui/Section';
import { Segmented } from '../ui/Segmented';
import { Text } from '../ui/Text';
import { Toggle } from '../ui/Toggle';
import { TopBar } from '../ui/TopBar';
import { colors, fonts, radius } from '../ui/theme';

const LEVELS: { label: string; hint: string; value: SarcasmLevel }[] = [
  { label: 'Gentle', hint: 'A tap on the shoulder. Notifications only.', value: 'gentle' },
  { label: 'Normal', hint: 'Honest, with a raised eyebrow. Full-screen callout.', value: 'normal' },
  { label: 'Savage', hint: 'You asked for this. Harsher, and it escalates faster.', value: 'savage' },
];

const alertLabel = (m: AlertAfter) => (m < 1 ? '30 s' : `${m} min`);
const limitShort = (m: DailyLimit) => (m === null ? 'None' : formatMinutes(m));

export default function AccountabilityScreen() {
  const { state, dispatch, lastSync, resync } = useAppStore();
  const perms = usePermissions();
  const s = state.settings;
  const [newPkg, setNewPkg] = useState('');
  const [pausedUntil, setPausedUntil] = useState(UsageStats.getPausedUntil);
  const [running, setRunning] = useState(UsageStats.isWatcherRunning);

  const refreshStatus = useCallback(() => {
    setRunning(UsageStats.isWatcherRunning());
    setPausedUntil(UsageStats.getPausedUntil());
  }, []);
  useEffect(() => {
    const id = setTimeout(refreshStatus, 600);
    return () => clearTimeout(id);
  }, [lastSync, refreshStatus]);

  const update = (patch: Partial<AccountabilitySettings>) => dispatch({ type: 'updateSettings', patch });

  const toggleTracked = (pkg: string, on: boolean) =>
    update({ trackedPackages: on ? [...s.trackedPackages, pkg] : s.trackedPackages.filter((p) => p !== pkg) });

  const addCustom = () => {
    const pkg = newPkg.trim();
    if (!/^[a-zA-Z][\w]*(\.[\w]+)+$/.test(pkg) || s.trackedPackages.includes(pkg)) return;
    update({ trackedPackages: [...s.trackedPackages, pkg] });
    setNewPkg('');
  };

  const paused = pausedUntil > Date.now();
  const togglePause = () => {
    UsageStats.setPausedUntil(paused ? 0 : dayStartOffset(Date.now(), 1));
    refreshStatus();
  };

  const alertOptions = (__DEV__ ? DEV_ALERT_AFTER_OPTIONS : ALERT_AFTER_OPTIONS).map((m) => ({ label: alertLabel(m), value: m }));
  const limitOptions = (__DEV__ ? DEV_DAILY_LIMIT_OPTIONS : DAILY_LIMIT_OPTIONS).map((m) => ({
    label: limitShort(m),
    value: m,
    accessibilityLabel: m === null ? 'No daily limit' : `${formatMinutes(m)} daily limit`,
  }));
  const customPkgs = s.trackedPackages.filter((p) => !KNOWN_APPS[p]);
  const preview = previewLine(s.sarcasmLevel, focusQuest(state), new Date());

  return (
    <Screen header={<TopBar onBack={() => router.back()} title="Accountability" />}>
      <Text variant="body">Later Me only speaks up when your own numbers say it should. You set how blunt it gets.</Text>

      <Card style={styles.first}>
        <Row
          icon="shield"
          iconColor={colors.sarcasm}
          iconBackground={colors.sarcasmWash}
          label="Distraction alerts"
          sublabel="Callouts when you drift off-quest"
          right={<Toggle value={s.alertsEnabled} onChange={(alertsEnabled) => update({ alertsEnabled })} accessibilityLabel="Distraction alerts" />}
          last
        />
        {s.alertsEnabled ? (
          <View style={styles.status} accessibilityLiveRegion="polite">
            <View style={[styles.dot, { backgroundColor: running ? colors.mint : colors.warning }]} />
            <Text variant="cap" style={styles.grow}>
              {running ? 'Watching' : lastSync && !lastSync.ok ? "Android didn't let the watcher start" : 'Not running'}
            </Text>
            {!running ? <Button small kind="secondary" label="Retry" onPress={resync} /> : null}
          </View>
        ) : null}
      </Card>

      <Section title="Sarcasm level">
        <Card>
          <RadioGroup options={LEVELS} value={s.sarcasmLevel} onChange={(sarcasmLevel) => update({ sarcasmLevel })} />
        </Card>
        {s.sarcasmLevel === 'gentle' && !perms.notifications ? (
          <Text variant="cap" color={colors.warning} style={styles.warn}>
            Gentle callouts are notifications, and notifications are off. Fix it under Permissions.
          </Text>
        ) : null}
      </Section>

      <Section title="Alert after">
        <Segmented options={alertOptions} value={s.alertAfterMinutes} onChange={(alertAfterMinutes) => update({ alertAfterMinutes })} />
        <Text variant="meta" style={styles.hint}>Continuous time in a tracked app before the first callout.</Text>
      </Section>

      <Section title="Daily limit" right={<Text variant="cap" num color={colors.text}>{limitShort(s.dailyLimitMinutes)}</Text>}>
        <Segmented options={limitOptions} value={s.dailyLimitMinutes} onChange={(dailyLimitMinutes) => update({ dailyLimitMinutes })} />
        <Text variant="meta" style={styles.hint}>Crossing it gets one callout that day, however it was spread out.</Text>
      </Section>

      <Section title="Tracked apps">
        <Card>
          {Object.entries(KNOWN_APPS).map(([pkg, name]) => (
            <Row
              key={pkg}
              label={name}
              right={<Toggle value={s.trackedPackages.includes(pkg)} onChange={(on) => toggleTracked(pkg, on)} accessibilityLabel={`Track ${name}`} />}
            />
          ))}
          {customPkgs.map((pkg) => (
            <Row
              key={pkg}
              label={appLabel(pkg)}
              sublabel={pkg}
              right={<Button small kind="tertiary" label="Remove" onPress={() => toggleTracked(pkg, false)} />}
            />
          ))}
          <View style={styles.addRow}>
            <View style={styles.grow}>
              <Field
                value={newPkg}
                onChangeText={setNewPkg}
                placeholder="com.example.app"
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Package name to track"
                onSubmitEditing={addCustom}
              />
            </View>
            <Button small kind="secondary" label="Add" onPress={addCustom} style={styles.addBtn} />
          </View>
        </Card>
        {s.trackedPackages.length === 0 ? (
          <Text variant="cap" color={colors.warning} style={styles.warn}>Nothing is tracked, so nothing will be called out.</Text>
        ) : null}
      </Section>

      <Section title="Permissions">
        <Card>
          <PermissionRow name={PERMISSION_NAMES.usage} granted={perms.usage} onFix={perms.openUsageSettings} />
          <PermissionRow name={PERMISSION_NAMES.overlay} granted={perms.overlay} onFix={perms.openOverlaySettings} />
          <PermissionRow name={PERMISSION_NAMES.notifications} granted={perms.notifications} onFix={perms.requestNotifications} />
          <PermissionRow
            name={PERMISSION_NAMES.battery}
            hint="Stops Android pausing the watcher"
            granted={perms.battery}
            onFix={perms.openBatterySettings}
            last
          />
        </Card>
      </Section>

      <Section title="Preview">
        <View style={styles.push} accessible accessibilityLabel={`Preview callout: ${preview}`}>
          <View style={styles.pushHead}>
            <View style={styles.pushIcon}><Icon name="flag" size={12} color={colors.onAccent} /></View>
            <Text variant="meta">Later Me · now</Text>
          </View>
          <Text style={styles.pushTitle}>Still here?</Text>
          <Text style={styles.pushText}>{preview}</Text>
        </View>
      </Section>

      <Section title="Not today">
        {paused ? <Text variant="cap" style={styles.pausedText}>Callouts are paused until {formatClock(new Date(pausedUntil))}.</Text> : null}
        <Button kind="secondary" label={paused ? 'Resume callouts' : 'Pause until midnight'} onPress={togglePause} />
      </Section>
    </Screen>
  );
}

function PermissionRow({
  name,
  hint,
  granted,
  onFix,
  last,
}: {
  name: string;
  hint?: string;
  granted: boolean;
  onFix: () => void;
  last?: boolean;
}) {
  return (
    <Row
      label={name}
      sublabel={hint}
      right={granted ? <Chip label="On" tone="mint" /> : <Button small label="Turn on" onPress={onFix} />}
      last={last}
    />
  );
}

const styles = StyleSheet.create({
  first: { marginTop: 20 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  grow: { flex: 1 },
  warn: { marginTop: 10 },
  hint: { marginTop: 8, fontSize: 12.5 },
  addRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 12, marginBottom: -12 },
  addBtn: { marginTop: 4 },
  push: {
    backgroundColor: colors.elevated,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  pushHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  pushIcon: { width: 20, height: 20, borderRadius: 6, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  pushTitle: { fontFamily: fonts.semibold, fontSize: 14.5, lineHeight: 20, color: colors.text },
  pushText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.text2, marginTop: 2 },
  pausedText: { marginBottom: 10 },
});
