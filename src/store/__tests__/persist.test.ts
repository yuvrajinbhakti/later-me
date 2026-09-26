jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { LEGACY_GOAL_KEY, STATE_KEY } from '../../domain/migration';
import { legacyWatcherWasOn, loadAppState, saveAppState } from '../persist';

const NOW = new Date(2026, 8, 26, 12, 0);
const makeId = (() => {
  let n = 0;
  return () => `id${++n}`;
})();
const opts = { watcherRunning: true, isDev: false };
beforeEach(() => AsyncStorage.clear());

it('migrates legacy data on first load and saves v2', async () => {
  await AsyncStorage.setItem(
    LEGACY_GOAL_KEY,
    JSON.stringify({
      aim: 'Ship',
      targetDate: '2026-12-31T00:00:00.000Z',
      hoursPerWeek: 5,
      currentStep: 'Write spec',
      stepsTotal: 3,
      stepsDone: 0,
      createdAt: NOW.toISOString(),
    }),
  );
  const s = await loadAppState(NOW, makeId, opts);
  expect(s.quests[0].title).toBe('Ship');
  expect(await AsyncStorage.getItem(STATE_KEY)).not.toBeNull();
  expect(await AsyncStorage.getItem(LEGACY_GOAL_KEY)).not.toBeNull();
});

it('does not migrate again once v2 exists', async () => {
  const first = await loadAppState(NOW, makeId, opts);
  await AsyncStorage.setItem(LEGACY_GOAL_KEY, JSON.stringify({ aim: 'Late arrival', targetDate: NOW.toISOString() }));
  expect((await loadAppState(NOW, makeId, opts)).quests).toEqual(first.quests);
});

it('backs up corrupt v2 data and starts clean', async () => {
  await AsyncStorage.setItem(STATE_KEY, '{broken');
  const s = await loadAppState(NOW, makeId, opts);
  expect(s.quests).toEqual([]);
  const keys = await AsyncStorage.getAllKeys();
  const backup = keys.find((k) => k.startsWith(`${STATE_KEY}.corrupt.`));
  expect(backup).toBeDefined();
  expect(await AsyncStorage.getItem(backup!)).toBe('{broken');
});

it('loads what was saved', async () => {
  const s = await loadAppState(NOW, makeId, opts);
  await saveAppState({ ...s, settings: { ...s.settings, sarcasmLevel: 'savage' } });
  expect((await loadAppState(NOW, makeId, opts)).settings.sarcasmLevel).toBe('savage');
});

describe('legacyWatcherWasOn', () => {
  // Installing an update kills the service, so on the first launch after upgrading it never runs.
  it('counts a saved Phase 1 watcher config even though the upgrade stopped the service', () =>
    expect(legacyWatcherWasOn({ isWatcherRunning: () => false, hasSavedWatcherConfig: () => true })).toBe(true));
  it('is on when the service is running', () =>
    expect(legacyWatcherWasOn({ isWatcherRunning: () => true, hasSavedWatcherConfig: () => false })).toBe(true));
  it('is off when the watcher was never started', () =>
    expect(legacyWatcherWasOn({ isWatcherRunning: () => false, hasSavedWatcherConfig: () => false })).toBe(false));
});

it('snaps dev-only settings when loading in a production build', async () => {
  const s = await loadAppState(NOW, makeId, opts);
  await saveAppState({ ...s, settings: { ...s.settings, alertAfterMinutes: 0.5 } });
  expect((await loadAppState(NOW, makeId, opts)).settings.alertAfterMinutes).toBe(5);
});
