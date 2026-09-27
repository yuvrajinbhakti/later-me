import { migrateLegacy, normalizeSettings, parseState } from '../migration';
import { questProgress } from '../quests';
import { DEFAULT_SETTINGS, type AppState } from '../types';

const NOW = new Date(2026, 8, 26, 12, 0);
const makeId = (() => {
  let n = 0;
  return () => `id${++n}`;
})();
const running = { watcherRunning: true };
const goal = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    aim: 'Backend engineer role by December',
    targetDate: '2026-12-31T00:00:00.000Z',
    hoursPerWeek: 10,
    currentStep: 'DDIA chapter 7',
    stepsTotal: 10,
    stepsDone: 0,
    createdAt: '2026-08-31T13:00:00.000Z',
    ...over,
  });
const settings = (thresholdSeconds: number) =>
  JSON.stringify({
    watchedPackages: ['com.instagram.android', 'com.android.chrome'],
    thresholdSeconds,
    cooldownSeconds: 20,
  });

describe('migrateLegacy', () => {
  it('turns the old goal into the focus quest', () => {
    const s = migrateLegacy(goal(), settings(30), NOW, makeId, running);
    const q = s.quests[0];
    expect(q).toMatchObject({
      title: 'Backend engineer role by December',
      targetDate: '2026-12-31',
      hoursPerWeek: 10,
      status: 'active',
      createdAt: '2026-08-31T13:00:00.000Z',
    });
    expect(q.milestones[0].title).toBe('Roadmap');
    expect(q.milestones[0].tasks[0].title).toBe('DDIA chapter 7');
    expect(q.milestones[0].tasks).toHaveLength(10);
    expect(s.focusQuestId).toBe(q.id);
  });

  it('keeps step progress: 4 of 10 done, current step is the fifth', () => {
    const q = migrateLegacy(goal({ stepsDone: 4 }), null, NOW, makeId, running).quests[0];
    expect(questProgress(q)).toBeCloseTo(0.4);
    const tasks = q.milestones[0].tasks;
    expect(tasks.slice(0, 4).every((t) => t.done && t.doneAt === '2026-08-31T13:00:00.000Z')).toBe(true);
    expect(tasks[4]).toMatchObject({ title: 'DDIA chapter 7', done: false });
    expect(tasks[5].title).toBe('Step 6');
  });

  it('makes room for the current step when done already equals total', () => {
    const tasks = migrateLegacy(goal({ stepsDone: 3, stepsTotal: 3 }), null, NOW, makeId, running).quests[0]
      .milestones[0].tasks;
    expect(tasks).toHaveLength(4);
    expect(tasks[3]).toMatchObject({ title: 'DDIA chapter 7', done: false });
  });

  it('keeps the local calendar day of a non-midnight-UTC legacy date', () => {
    const local = new Date(2026, 11, 20); // what `new Date('Dec 20 2026')` produced on the device
    expect(
      migrateLegacy(goal({ targetDate: local.toISOString() }), null, NOW, makeId, running).quests[0].targetDate,
    ).toBe('2026-12-20');
  });

  it('clamps a zero weekly budget to one hour', () =>
    expect(migrateLegacy(goal({ hoursPerWeek: 0 }), null, NOW, makeId, running).quests[0].hoursPerWeek).toBe(1));

  it('carries tracked apps and rounds the threshold to an alert-after option', () => {
    expect(migrateLegacy(goal(), settings(30), NOW, makeId, running).settings).toMatchObject({
      trackedPackages: ['com.instagram.android', 'com.android.chrome'],
      alertAfterMinutes: 5,
    });
    expect(migrateLegacy(null, settings(720), NOW, makeId, running).settings.alertAfterMinutes).toBe(10);
    expect(migrateLegacy(null, settings(1500), NOW, makeId, running).settings.alertAfterMinutes).toBe(30);
  });

  it('keeps alerts off when the old watcher was stopped', () =>
    expect(migrateLegacy(goal(), settings(600), NOW, makeId, { watcherRunning: false }).settings.alertsEnabled).toBe(
      false,
    ));

  it('uses a placeholder task when there was no current step', () =>
    expect(
      migrateLegacy(goal({ currentStep: '' }), null, NOW, makeId, running).quests[0].milestones[0].tasks[0].title,
    ).toBe('Decide your next step'));

  it('returns the default state when there is nothing legacy', () =>
    expect(migrateLegacy(null, null, NOW, makeId, { watcherRunning: false })).toEqual({
      version: 2,
      quests: [],
      focusQuestId: null,
      settings: DEFAULT_SETTINGS,
    }));

  it('ignores unparseable legacy JSON', () =>
    expect(migrateLegacy('{bad', '{bad', NOW, makeId, running).quests).toEqual([]));
});

describe('parseState', () => {
  const valid = (): AppState => migrateLegacy(goal(), settings(30), NOW, makeId, running);

  it('round-trips a valid state', () => {
    const s = valid();
    expect(parseState(JSON.stringify(s))).toEqual({ state: s, corrupt: false });
  });

  it('flags malformed JSON', () => expect(parseState('{nope')).toEqual({ state: null, corrupt: true }));
  it('flags a wrong version', () => expect(parseState('{"version":1}')).toEqual({ state: null, corrupt: true }));
  it('flags a non-object', () => expect(parseState('42')).toEqual({ state: null, corrupt: true }));
  it('treats missing data as not corrupt', () => expect(parseState(null)).toEqual({ state: null, corrupt: false }));

  it('survives unknown extra keys and fills missing settings from defaults', () => {
    const s = valid();
    const raw = JSON.stringify({ ...s, futureThing: 1, settings: { sarcasmLevel: 'savage', xp: 9 } });
    expect(parseState(raw).state?.settings).toEqual({ ...DEFAULT_SETTINGS, sarcasmLevel: 'savage' });
  });

  it('replaces an invalid settings value with its default', () => {
    const raw = JSON.stringify({ ...valid(), settings: { ...DEFAULT_SETTINGS, alertAfterMinutes: 7 } });
    expect(parseState(raw).state?.settings.alertAfterMinutes).toBe(DEFAULT_SETTINGS.alertAfterMinutes);
  });

  it('drops a malformed quest and keeps the good one', () => {
    const s = valid();
    const raw = JSON.stringify({ ...s, quests: [{ id: 5, title: null }, s.quests[0]] });
    expect(parseState(raw).state?.quests.map((q) => q.id)).toEqual([s.quests[0].id]);
  });

  it('drops malformed tasks inside a good quest', () => {
    const s = valid();
    const q = s.quests[0];
    const broken = { ...q, milestones: [{ ...q.milestones[0], tasks: [{ id: 'x' }, q.milestones[0].tasks[0]] }] };
    const parsed = parseState(JSON.stringify({ ...s, quests: [broken] })).state!;
    expect(parsed.quests[0].milestones[0].tasks).toEqual([q.milestones[0].tasks[0]]);
  });

  it('drops milestones that have no tasks left', () => {
    const s = valid();
    const q = s.quests[0];
    const withEmpty = { ...q, milestones: [...q.milestones, { id: 'empty', title: 'Race week', tasks: [] }] };
    const parsed = parseState(JSON.stringify({ ...s, quests: [withEmpty] })).state!;
    expect(parsed.quests[0].milestones.map((m) => m.id)).toEqual(q.milestones.map((m) => m.id));
  });

  it('re-points focus at the newest active quest when the stored one is gone', () => {
    const s = valid();
    expect(parseState(JSON.stringify({ ...s, focusQuestId: 'missing' })).state?.focusQuestId).toBe(s.quests[0].id);
  });

  it('turns AI callouts on for a state saved before the setting existed', () => {
    const { aiCallouts: _, ...older } = valid().settings;
    expect(parseState(JSON.stringify({ ...valid(), settings: older })).state?.settings.aiCallouts).toBe(true);
  });

  it('keeps AI callouts off once turned off', () =>
    expect(parseState(JSON.stringify({ ...valid(), settings: { ...DEFAULT_SETTINGS, aiCallouts: false } })).state?.settings.aiCallouts).toBe(
      false,
    ));

  const set = { basis: 'b', createdAt: '2026-09-27T10:00:00.000Z', tiers: [['one line here'], [], []], limit: ['limit line'] };

  it('round-trips saved AI callout lines', () => {
    const s = { ...valid(), aiCallouts: set };
    expect(parseState(JSON.stringify(s)).state?.aiCallouts).toEqual(set);
  });

  it.each([
    ['a missing basis', { ...set, basis: 7 }],
    ['non-string lines', { ...set, tiers: [[1], [], []] }],
    ['the wrong number of tiers', { ...set, tiers: [[]] }],
    ['a missing limit list', { ...set, limit: undefined }],
  ])('drops saved AI lines with %s', (_, bad) =>
    expect(parseState(JSON.stringify({ ...valid(), aiCallouts: bad })).state).not.toHaveProperty('aiCallouts'));
});

describe('normalizeSettings', () => {
  const devValues = { ...DEFAULT_SETTINGS, alertAfterMinutes: 0.5 as const, dailyLimitMinutes: 1 as const };
  it('keeps dev-only values in dev builds', () => expect(normalizeSettings(devValues, true)).toEqual(devValues));
  it('snaps dev-only values to production options elsewhere', () =>
    expect(normalizeSettings(devValues, false)).toMatchObject({ alertAfterMinutes: 5, dailyLimitMinutes: 60 }));
});
