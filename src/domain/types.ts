export type QuestStatus = 'active' | 'paused' | 'completed';
export type SarcasmLevel = 'gentle' | 'normal' | 'savage';

/** 0.5 is offered only in dev builds, for testing callouts without waiting minutes. */
export type AlertAfter = 0.5 | 5 | 10 | 15 | 30;
/** 1 is offered only in dev builds. null means no daily limit. */
export type DailyLimit = 1 | 60 | 120 | 180 | null;

export interface Task {
  id: string;
  title: string;
  minutes: number | null;
  done: boolean;
  doneAt: string | null;
}

export interface Milestone {
  id: string;
  title: string;
  tasks: Task[];
}

export interface Quest {
  id: string;
  title: string;
  why: string;
  /** Local calendar date, YYYY-MM-DD. */
  targetDate: string;
  hoursPerWeek: number;
  status: QuestStatus;
  createdAt: string;
  completedAt: string | null;
  milestones: Milestone[];
}

export interface AccountabilitySettings {
  alertsEnabled: boolean;
  sarcasmLevel: SarcasmLevel;
  alertAfterMinutes: AlertAfter;
  dailyLimitMinutes: DailyLimit;
  trackedPackages: string[];
  /** Let Claude rewrite callout lines for the focus quest; needs an API key. */
  aiCallouts: boolean;
}

/**
 * Callout lines Claude wrote for one quest at one sarcasm level. {goal} and {task} are filled when pools
 * are built, the minute and day placeholders when a callout fires. An empty tier means "use built-in lines".
 */
export interface AiCalloutSet {
  basis: string;
  createdAt: string;
  tiers: string[][];
  limit: string[];
}

export interface AppState {
  version: 2;
  quests: Quest[];
  focusQuestId: string | null;
  settings: AccountabilitySettings;
  aiCallouts?: AiCalloutSet;
}

export interface QuestDraft {
  title: string;
  why: string;
  targetDate: string;
  hoursPerWeek: number;
  milestones: { title: string; tasks: { title: string; minutes: number | null }[] }[];
}

export interface AppUsage {
  pkg: string;
  label: string;
  minutes: number;
  opens: number;
}

export const ALERT_AFTER_OPTIONS: AlertAfter[] = [5, 10, 15, 30];
export const DEV_ALERT_AFTER_OPTIONS: AlertAfter[] = [0.5, 5, 10, 15, 30];
export const DAILY_LIMIT_OPTIONS: DailyLimit[] = [60, 120, 180, null];
export const DEV_DAILY_LIMIT_OPTIONS: DailyLimit[] = [1, 60, 120, 180, null];

export const DEFAULT_SETTINGS: AccountabilitySettings = {
  alertsEnabled: true,
  sarcasmLevel: 'normal',
  alertAfterMinutes: 10,
  dailyLimitMinutes: 120,
  trackedPackages: ['com.instagram.android'],
  aiCallouts: true,
};
