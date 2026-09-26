import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { UsageStats } from '../../modules/usage-stats';
import { Button, Card, Dim, Field, StatusPill, Title } from '../components';
import { buildRoastTiers } from '../roasts';
import { loadGoal, loadWatcherSettings, saveWatcherSettings } from '../storage';
import { colors, spacing } from '../theme';
import { DEFAULT_WATCHER_SETTINGS, Goal, KNOWN_APPS, WatcherSettings } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;

export function WatcherScreen() {
  const [usageAccess, setUsageAccess] = useState(false);
  const [overlayPerm, setOverlayPerm] = useState(false);
  const [running, setRunning] = useState(false);
  const [pausedUntil, setPausedUntil] = useState(0);
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [foreground, setForeground] = useState<string | null>(null);
  const [settings, setSettings] = useState<WatcherSettings>(DEFAULT_WATCHER_SETTINGS);
  const [newPackage, setNewPackage] = useState('');
  const [threshold, setThreshold] = useState(String(DEFAULT_WATCHER_SETTINGS.thresholdSeconds));
  const [cooldown, setCooldown] = useState(String(DEFAULT_WATCHER_SETTINGS.cooldownSeconds));
  const [goal, setGoal] = useState<Goal | null>(null);
  const [preview, setPreview] = useState('');

  // Watched list must be readable inside the interval without re-creating it
  // (and without clobbering unsaved edits on every tick).
  const watchedRef = useRef(settings.watchedPackages);
  watchedRef.current = settings.watchedPackages;

  /** Live status only — never touches user-editable state. */
  const refresh = useCallback(async () => {
    if (!UsageStats.isSupported) return;
    setUsageAccess(UsageStats.hasUsageAccess());
    setOverlayPerm(UsageStats.hasOverlayPermission());
    setRunning(UsageStats.isWatcherRunning());
    setPausedUntil(UsageStats.getPausedUntil());
    setGoal(await loadGoal());
    if (UsageStats.hasUsageAccess()) {
      setUsage(await UsageStats.getUsageToday(watchedRef.current));
      setForeground(await UsageStats.getForegroundApp());
    }
  }, []);

  // Load persisted settings once on mount; poll live status separately.
  useEffect(() => {
    loadWatcherSettings().then((s) => {
      setSettings(s);
      setThreshold(String(s.thresholdSeconds));
      setCooldown(String(s.cooldownSeconds));
      refresh();
    });
    const id = setInterval(refresh, 10000);
    return () => clearInterval(id);
  }, [refresh]);

  const totalMinutesToday = Object.values(usage).reduce((a, b) => a + b, 0);

  const persistSettings = async (): Promise<WatcherSettings> => {
    const s: WatcherSettings = {
      watchedPackages: settings.watchedPackages,
      thresholdSeconds: Math.max(parseInt(threshold, 10) || 600, 10),
      cooldownSeconds: Math.max(parseInt(cooldown, 10) || 120, 10),
    };
    await saveWatcherSettings(s);
    setSettings(s);
    return s;
  };

  const onStart = async () => {
    if (!usageAccess || !overlayPerm) {
      Alert.alert('Permissions first', 'Grant both Usage access and Display over other apps below.');
      return;
    }
    const s = await persistSettings();
    const roasts = buildRoastTiers(goal, totalMinutesToday);
    UsageStats.startWatcher(
      {
        watchedPackages: s.watchedPackages,
        thresholdSeconds: s.thresholdSeconds,
        cooldownSeconds: s.cooldownSeconds,
        goalLabel: goal?.aim ?? '',
        sarcasmLevel: 'normal',
        dailyLimitMinutes: 0,
        targetDateMs: 0,
      },
      { tiers: roasts, limit: [] }
    );
    setTimeout(refresh, 500);
  };

  const onStop = () => {
    UsageStats.stopWatcher();
    setTimeout(refresh, 500);
  };

  const onNotToday = () => {
    const isPaused = pausedUntil > Date.now();
    if (isPaused) {
      UsageStats.setPausedUntil(0);
    } else {
      // Until local midnight. No confirmation, no guilt — by design.
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      UsageStats.setPausedUntil(midnight.getTime());
    }
    setTimeout(refresh, 200);
  };

  const addPackage = async () => {
    const pkg = newPackage.trim();
    if (!pkg || settings.watchedPackages.includes(pkg)) return;
    const s = { ...settings, watchedPackages: [...settings.watchedPackages, pkg] };
    setSettings(s);
    setNewPackage('');
    await saveWatcherSettings(s);
  };

  const removePackage = async (pkg: string) => {
    const s = { ...settings, watchedPackages: settings.watchedPackages.filter((p) => p !== pkg) };
    setSettings(s);
    await saveWatcherSettings(s);
  };

  const onPreviewRoast = () => {
    const tiers = buildRoastTiers(goal, totalMinutesToday);
    const line = tiers[0][Math.floor(Math.random() * tiers[0].length)];
    setPreview(line.replace('{sessionMinutes}', '17'));
  };

  if (!UsageStats.isSupported) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: spacing.lg }}>
        <Card>
          <Title>Android only (for now)</Title>
          <Dim>The watcher uses UsageStatsManager + overlays. iOS gets the Screen Time shield in Phase 2.</Dim>
        </Card>
      </View>
    );
  }

  const isPaused = pausedUntil > Date.now();

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.md }}>
      <Card>
        <Title>🔐 Permissions</Title>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <StatusPill ok={usageAccess} okText='Usage access' badText='Usage access missing' />
          <StatusPill ok={overlayPerm} okText='Overlay' badText='Overlay missing' />
        </View>
        {!usageAccess && (
          <Button kind='ghost' label='Open Usage access settings' onPress={() => UsageStats.openUsageAccessSettings()} />
        )}
        {!overlayPerm && (
          <Button kind='ghost' label='Open Overlay settings' onPress={() => UsageStats.openOverlaySettings()} />
        )}
      </Card>

      <Card>
        <Title>📱 Watched apps</Title>
        {settings.watchedPackages.map((pkg) => (
          <View key={pkg} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 }}>
            <View>
              <Text style={{ color: colors.text, fontSize: 15 }}>{KNOWN_APPS[pkg] ?? pkg}</Text>
              <Text style={{ color: colors.textDim, fontSize: 12 }}>
                {pkg} · {usage[pkg] != null ? `${usage[pkg].toFixed(0)} min today` : '–'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => removePackage(pkg)}>
              <Text style={{ color: colors.danger, fontSize: 13 }}>remove</Text>
            </TouchableOpacity>
          </View>
        ))}
        <Field label='Add package name' value={newPackage} onChangeText={setNewPackage} placeholder='com.google.android.youtube' />
        <Button kind='ghost' label='Add app' onPress={addPackage} />
        <View style={{ height: spacing.sm }} />
        <Dim>Foreground now: {foreground ?? 'unknown'}</Dim>
        <Dim>Watched total today: {totalMinutesToday.toFixed(0)} min</Dim>
      </Card>

      <Card>
        <Title>⚙️ Trigger</Title>
        <Field label='Continuous seconds before the overlay fires' value={threshold} onChangeText={setThreshold} keyboardType='numeric' />
        <Field label='Cooldown seconds after dismissing' value={cooldown} onChangeText={setCooldown} keyboardType='numeric' />
      </Card>

      <Card>
        <Title>{running ? '🟢 Watcher is running' : '⚪ Watcher is off'}</Title>
        {isPaused && (
          <Text style={{ color: colors.warn, marginBottom: spacing.sm }}>
            Paused until {new Date(pausedUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — no roasts today.
          </Text>
        )}
        {running ? (
          <Button kind='danger' label='Stop watcher' onPress={onStop} />
        ) : (
          <Button label='Start watcher' onPress={onStart} />
        )}
        <Button
          kind='ghost'
          label={isPaused ? 'Resume roasting' : 'Not today (pause until midnight)'}
          onPress={onNotToday}
        />
        <View style={{ height: spacing.sm }} />
        <Button kind='ghost' label='Preview a roast' onPress={onPreviewRoast} />
        {preview ? (
          <Text style={{ color: colors.text, fontSize: 14, marginTop: spacing.sm, fontStyle: 'italic' }}>
            “{preview}”
          </Text>
        ) : null}
      </Card>
    </ScrollView>
  );
}
