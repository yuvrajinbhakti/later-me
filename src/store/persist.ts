import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LEGACY_GOAL_KEY,
  LEGACY_SETTINGS_KEY,
  STATE_KEY,
  migrateLegacy,
  normalizeSettings,
  parseState,
} from '../domain/migration';
import { emptyState } from '../domain/quests';
import type { AppState } from '../domain/types';

export async function loadAppState(
  now: Date,
  makeId: () => string,
  opts: { watcherRunning: boolean; isDev: boolean },
): Promise<AppState> {
  const raw = await AsyncStorage.getItem(STATE_KEY);
  const { state, corrupt } = parseState(raw);

  let result: AppState;
  if (state) {
    result = state;
  } else if (corrupt) {
    await AsyncStorage.setItem(`${STATE_KEY}.corrupt.${now.getTime()}`, raw as string);
    result = emptyState();
  } else {
    const [goal, settings] = await Promise.all([
      AsyncStorage.getItem(LEGACY_GOAL_KEY),
      AsyncStorage.getItem(LEGACY_SETTINGS_KEY),
    ]);
    result = migrateLegacy(goal, settings, now, makeId, opts);
  }

  result = { ...result, settings: normalizeSettings(result.settings, opts.isDev) };
  if (!state) await saveAppState(result);
  return result;
}

export async function saveAppState(s: AppState): Promise<void> {
  await AsyncStorage.setItem(STATE_KEY, JSON.stringify(s));
}
