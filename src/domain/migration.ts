import { monthsFromNow, toLocalYmd } from './format';
import { addQuest, emptyState, newestActiveId } from './quests';
import {
  ALERT_AFTER_OPTIONS,
  DEFAULT_SETTINGS,
  DEV_ALERT_AFTER_OPTIONS,
  DEV_DAILY_LIMIT_OPTIONS,
  type AccountabilitySettings,
  type AiCalloutSet,
  type AppState,
  type Milestone,
  type Quest,
  type QuestStatus,
  type SarcasmLevel,
  type Task,
} from './types';

export const LEGACY_GOAL_KEY = 'later-me/goal';
export const LEGACY_SETTINGS_KEY = 'later-me/watcher-settings';
export const STATE_KEY = 'later-me/state/v2';

type Json = Record<string, unknown>;

const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const isString = (v: unknown): v is string => typeof v === 'string';
const isYmd = (v: unknown): v is string => isString(v) && /^\d{4}-\d{2}-\d{2}$/.test(v);

function tryParse(raw: string | null): unknown {
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Phase 1 saved `new Date(input).toISOString()`: date-only input is UTC midnight, anything else local. */
function legacyYmd(iso: unknown, now: Date): string {
  if (isString(iso) && iso.endsWith('T00:00:00.000Z')) return iso.slice(0, 10);
  const d = isString(iso) ? new Date(iso) : new Date(NaN);
  if (Number.isNaN(d.getTime())) return monthsFromNow(now, 3);
  return toLocalYmd(d);
}

function nearestAlertAfter(seconds: number): AccountabilitySettings['alertAfterMinutes'] {
  const minutes = seconds / 60;
  return ALERT_AFTER_OPTIONS.reduce((best, o) => (Math.abs(o - minutes) < Math.abs(best - minutes) ? o : best));
}

function legacyQuest(goal: Json, now: Date, makeId: () => string): Quest | null {
  if (!isString(goal.aim) || goal.aim.trim() === '') return null;
  const createdAt = isString(goal.createdAt) ? goal.createdAt : now.toISOString();
  const stepsDone = Math.max(0, Math.floor(Number(goal.stepsDone) || 0));
  const total = Math.max(Math.floor(Number(goal.stepsTotal) || 0), stepsDone + 1);
  const current = isString(goal.currentStep) && goal.currentStep.trim() !== '' ? goal.currentStep.trim() : 'Decide your next step';

  const tasks: Task[] = Array.from({ length: total }, (_, i) => ({
    id: makeId(),
    title: i === stepsDone ? current : `Step ${i + 1}`,
    minutes: null,
    done: i < stepsDone,
    doneAt: i < stepsDone ? createdAt : null,
  }));

  return {
    id: makeId(),
    title: goal.aim.trim(),
    why: '',
    targetDate: legacyYmd(goal.targetDate, now),
    hoursPerWeek: Math.max(1, Number(goal.hoursPerWeek) || 1),
    status: 'active',
    createdAt,
    completedAt: null,
    milestones: [{ id: makeId(), title: 'Roadmap', tasks }],
  };
}

export function migrateLegacy(
  goalJson: string | null,
  settingsJson: string | null,
  now: Date,
  makeId: () => string,
  opts: { watcherRunning: boolean },
): AppState {
  const goal = tryParse(goalJson);
  const legacySettings = tryParse(settingsJson);
  const quest = isObject(goal) ? legacyQuest(goal, now, makeId) : null;
  if (!quest && !isObject(legacySettings)) return emptyState();

  const settings: AccountabilitySettings = { ...DEFAULT_SETTINGS, alertsEnabled: opts.watcherRunning };
  if (isObject(legacySettings)) {
    const pkgs = legacySettings.watchedPackages;
    if (Array.isArray(pkgs) && pkgs.length > 0 && pkgs.every(isString)) settings.trackedPackages = pkgs;
    if (typeof legacySettings.thresholdSeconds === 'number') {
      settings.alertAfterMinutes = nearestAlertAfter(legacySettings.thresholdSeconds);
    }
  }
  const base: AppState = { ...emptyState(), settings };
  return quest ? addQuest(base, quest) : base;
}

function parseTask(v: unknown): Task | null {
  if (!isObject(v) || !isString(v.id) || !isString(v.title) || typeof v.done !== 'boolean') return null;
  return {
    id: v.id,
    title: v.title,
    minutes: typeof v.minutes === 'number' ? v.minutes : null,
    done: v.done,
    doneAt: isString(v.doneAt) ? v.doneAt : null,
  };
}

/** A milestone without tasks would count as done, so one left empty is dropped. */
function parseMilestone(v: unknown): Milestone | null {
  if (!isObject(v) || !isString(v.id) || !isString(v.title) || !Array.isArray(v.tasks)) return null;
  const tasks = v.tasks.map(parseTask).filter((t): t is Task => t !== null);
  return tasks.length > 0 ? { id: v.id, title: v.title, tasks } : null;
}

const STATUSES: QuestStatus[] = ['active', 'paused', 'completed'];
const LEVELS: SarcasmLevel[] = ['gentle', 'normal', 'savage'];

function parseQuest(v: unknown): Quest | null {
  if (
    !isObject(v) ||
    !isString(v.id) ||
    !isString(v.title) ||
    !isYmd(v.targetDate) ||
    !STATUSES.includes(v.status as QuestStatus) ||
    !isString(v.createdAt) ||
    !Array.isArray(v.milestones)
  ) {
    return null;
  }
  return {
    id: v.id,
    title: v.title,
    why: isString(v.why) ? v.why : '',
    targetDate: v.targetDate,
    hoursPerWeek: typeof v.hoursPerWeek === 'number' && v.hoursPerWeek > 0 ? v.hoursPerWeek : 5,
    status: v.status as QuestStatus,
    createdAt: v.createdAt,
    completedAt: isString(v.completedAt) ? v.completedAt : null,
    milestones: v.milestones.map(parseMilestone).filter((m): m is Milestone => m !== null),
  };
}

function parseSettings(v: unknown): AccountabilitySettings {
  const s = isObject(v) ? v : {};
  const d = DEFAULT_SETTINGS;
  return {
    alertsEnabled: typeof s.alertsEnabled === 'boolean' ? s.alertsEnabled : d.alertsEnabled,
    sarcasmLevel: LEVELS.includes(s.sarcasmLevel as SarcasmLevel) ? (s.sarcasmLevel as SarcasmLevel) : d.sarcasmLevel,
    alertAfterMinutes: DEV_ALERT_AFTER_OPTIONS.includes(s.alertAfterMinutes as never)
      ? (s.alertAfterMinutes as AccountabilitySettings['alertAfterMinutes'])
      : d.alertAfterMinutes,
    dailyLimitMinutes: DEV_DAILY_LIMIT_OPTIONS.includes(s.dailyLimitMinutes as never)
      ? (s.dailyLimitMinutes as AccountabilitySettings['dailyLimitMinutes'])
      : d.dailyLimitMinutes,
    trackedPackages:
      Array.isArray(s.trackedPackages) && s.trackedPackages.every(isString) ? s.trackedPackages : d.trackedPackages,
    aiCallouts: typeof s.aiCallouts === 'boolean' ? s.aiCallouts : d.aiCallouts,
  };
}

const isLines = (v: unknown): v is string[] => Array.isArray(v) && v.every(isString);

/** Saved AI lines are a cache: anything off-shape is dropped and simply written again. */
function parseAiCallouts(v: unknown): AiCalloutSet | undefined {
  if (!isObject(v) || !isString(v.basis) || !isString(v.createdAt) || !isLines(v.limit)) return undefined;
  if (!Array.isArray(v.tiers) || v.tiers.length !== 3 || !v.tiers.every(isLines)) return undefined;
  return { basis: v.basis, createdAt: v.createdAt, tiers: v.tiers, limit: v.limit };
}

/** Unknown keys are ignored and missing ones defaulted, so later versions can add fields safely. */
export function parseState(raw: string | null): { state: AppState | null; corrupt: boolean } {
  if (raw === null) return { state: null, corrupt: false };
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { state: null, corrupt: true };
  }
  if (!isObject(value) || value.version !== 2) return { state: null, corrupt: true };

  const quests = Array.isArray(value.quests)
    ? value.quests.map(parseQuest).filter((q): q is Quest => q !== null)
    : [];
  const stored = quests.find((q) => q.status === 'active' && q.id === value.focusQuestId);

  const aiCallouts = parseAiCallouts(value.aiCallouts);
  return {
    state: {
      version: 2,
      quests,
      focusQuestId: stored?.id ?? newestActiveId(quests, null),
      settings: parseSettings(value.settings),
      ...(aiCallouts ? { aiCallouts } : {}),
    },
    corrupt: false,
  };
}

/** Dev builds offer 30-second alerts and a 1-minute limit; release builds must never keep them. */
export function normalizeSettings(s: AccountabilitySettings, isDev: boolean): AccountabilitySettings {
  if (isDev) return s;
  return {
    ...s,
    alertAfterMinutes: s.alertAfterMinutes === 0.5 ? 5 : s.alertAfterMinutes,
    dailyLimitMinutes: s.dailyLimitMinutes === 1 ? 60 : s.dailyLimitMinutes,
  };
}
