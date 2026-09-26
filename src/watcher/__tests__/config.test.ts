import { buildWatcherConfig, createWatcherSync, planSync, type WatcherNative } from '../config';
import { addQuest, createQuest, emptyState } from '../../domain/quests';
import type { AccountabilitySettings, AppState } from '../../domain/types';

const makeId = (() => {
  let n = 0;
  return () => `id${++n}`;
})();
const q = createQuest(
  {
    title: 'Ship it',
    why: '',
    targetDate: '2026-12-01',
    hoursPerWeek: 5,
    milestones: [{ title: 'M', tasks: [{ title: 'T', minutes: null }] }],
  },
  new Date(2026, 8, 1),
  makeId,
);
const base = addQuest(emptyState(), q);
const withSettings = (over: Partial<AccountabilitySettings>): AppState => ({
  ...base,
  settings: { ...base.settings, ...over },
});

describe('buildWatcherConfig', () => {
  it('converts alert-after minutes to seconds', () =>
    expect(buildWatcherConfig(withSettings({ alertAfterMinutes: 15 })).thresholdSeconds).toBe(900));

  it('supports the 30-second dev option', () =>
    expect(buildWatcherConfig(withSettings({ alertAfterMinutes: 0.5 })).thresholdSeconds).toBe(30));

  it.each([
    ['gentle', 120],
    ['normal', 120],
    ['savage', 60],
  ] as const)('%s escalation wait is %p seconds', (level, secs) =>
    expect(buildWatcherConfig(withSettings({ sarcasmLevel: level })).cooldownSeconds).toBe(secs));

  it('labels callouts with the focus quest and its local-midnight target', () => {
    const c = buildWatcherConfig(base);
    expect(c.goalLabel).toBe('Ship it');
    expect(c.targetDateMs).toBe(new Date(2026, 11, 1).getTime());
  });

  it('sends empty label and zero target without a focus quest', () =>
    expect(buildWatcherConfig(emptyState())).toMatchObject({ goalLabel: '', targetDateMs: 0 }));

  it('sends 0 when there is no daily limit', () =>
    expect(buildWatcherConfig(withSettings({ dailyLimitMinutes: null })).dailyLimitMinutes).toBe(0));

  it('passes tracked packages and level through', () =>
    expect(buildWatcherConfig(withSettings({ trackedPackages: ['a'], sarcasmLevel: 'gentle' }))).toMatchObject({
      watchedPackages: ['a'],
      sarcasmLevel: 'gentle',
    }));
});

describe('planSync', () => {
  const s = {
    alertsEnabled: true,
    usageAccess: true,
    running: true,
    configKey: 'c1',
    lastConfigKey: 'c1',
    roastsKey: 'r1',
    lastRoastsKey: 'r1',
  };
  it('stops a running watcher when alerts are off', () => expect(planSync({ ...s, alertsEnabled: false })).toBe('stop'));
  it('does nothing when alerts are off and nothing runs', () =>
    expect(planSync({ ...s, alertsEnabled: false, running: false })).toBe('none'));
  it('does not start without usage access', () =>
    expect(planSync({ ...s, running: false, usageAccess: false })).toBe('none'));
  it('starts when not running', () => expect(planSync({ ...s, running: false })).toBe('start'));
  it('restarts when the config changed', () => expect(planSync({ ...s, configKey: 'c2' })).toBe('start'));
  it('only pushes roasts when just the roasts changed', () => expect(planSync({ ...s, roastsKey: 'r2' })).toBe('roasts'));
  it('does nothing when nothing changed', () => expect(planSync(s)).toBe('none'));
});

describe('createWatcherSync', () => {
  const fakeNative = (over: Partial<WatcherNative> = {}) => {
    let running = false;
    const native = {
      hasUsageAccess: jest.fn(() => true),
      isWatcherRunning: jest.fn(() => running),
      startWatcher: jest.fn(() => {
        running = true;
        return true;
      }),
      stopWatcher: jest.fn(() => {
        running = false;
      }),
      setRoasts: jest.fn(),
      ...over,
    };
    return native;
  };

  it('starts once, then stays quiet when nothing changed', () => {
    const native = fakeNative();
    const sync = createWatcherSync(native);
    expect(sync(base)).toEqual({ action: 'start', ok: true });
    expect(native.startWatcher).toHaveBeenCalledWith(buildWatcherConfig(base), expect.objectContaining({ tiers: expect.any(Array) }));
    expect(sync(base)).toEqual({ action: 'none', ok: true });
    expect(native.startWatcher).toHaveBeenCalledTimes(1);
  });

  it('pushes only roasts when the focus quest changes wording but not config', () => {
    const native = fakeNative();
    const sync = createWatcherSync(native);
    sync(base);
    const ticked = { ...base, quests: [{ ...q, milestones: [{ ...q.milestones[0], tasks: [{ ...q.milestones[0].tasks[0], title: 'New task' }] }] }] };
    expect(sync(ticked).action).toBe('roasts');
    expect(native.setRoasts).toHaveBeenCalledTimes(1);
  });

  it('stops when alerts turn off and starts fresh when they turn back on', () => {
    const native = fakeNative();
    const sync = createWatcherSync(native);
    sync(base);
    expect(sync(withSettings({ alertsEnabled: false })).action).toBe('stop');
    expect(native.stopWatcher).toHaveBeenCalled();
    expect(sync(base).action).toBe('start');
  });

  it('retries a start the platform refused', () => {
    const native = fakeNative({ startWatcher: jest.fn(() => false) });
    const sync = createWatcherSync(native);
    expect(sync(base)).toEqual({ action: 'start', ok: false });
    expect(sync(base).action).toBe('start');
  });
});
