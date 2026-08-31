import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_WATCHER_SETTINGS, Goal, WatcherSettings } from './types';

const GOAL_KEY = 'later-me/goal';
const SETTINGS_KEY = 'later-me/watcher-settings';

export async function loadGoal(): Promise<Goal | null> {
  const raw = await AsyncStorage.getItem(GOAL_KEY);
  return raw ? (JSON.parse(raw) as Goal) : null;
}

export async function saveGoal(goal: Goal): Promise<void> {
  await AsyncStorage.setItem(GOAL_KEY, JSON.stringify(goal));
}

export async function loadWatcherSettings(): Promise<WatcherSettings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  return raw ? { ...DEFAULT_WATCHER_SETTINGS, ...JSON.parse(raw) } : DEFAULT_WATCHER_SETTINGS;
}

export async function saveWatcherSettings(settings: WatcherSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
