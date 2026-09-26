import { BANNED_PHRASES, buildRoastPools, observationLine, previewLine } from '../roasts';
import { createQuest } from '../quests';
import type { Quest, SarcasmLevel } from '../types';

const NOW = new Date(2026, 8, 26, 12, 0);
const makeId = (() => {
  let n = 0;
  return () => `id${++n}`;
})();
const quest = createQuest(
  {
    title: 'Become a better frontend engineer',
    why: '',
    targetDate: '2026-12-15',
    hoursPerWeek: 8,
    milestones: [{ title: 'System design', tasks: [{ title: 'Learn sharding', minutes: 45 }] }],
  },
  new Date(2026, 8, 1),
  makeId,
);
const LEVELS: SarcasmLevel[] = ['gentle', 'normal', 'savage'];
const ALLOWED = ['{sessionMinutes}', '{todayMinutes}', '{daysLeft}'];
const everyLine = (level: SarcasmLevel, q: Quest | null = quest) => {
  const pools = buildRoastPools(level, q);
  return [...pools.tiers.flat(), ...pools.limit];
};

it.each(LEVELS)('%s has three non-empty tiers and a limit pool', (level) => {
  const pools = buildRoastPools(level, quest);
  expect(pools.tiers).toHaveLength(3);
  pools.tiers.forEach((tier) => expect(tier.length).toBeGreaterThan(0));
  expect(pools.limit.length).toBeGreaterThan(0);
});

it('names the focus quest and its next task', () => {
  const text = everyLine('normal').join('\n');
  expect(text).toContain('Become a better frontend engineer');
  expect(text).toContain('Learn sharding');
});

it('leaves only watcher-filled placeholders', () => {
  const text = LEVELS.flatMap((l) => [...everyLine(l), ...everyLine(l, null)]).join('\n');
  expect(text).toContain('{sessionMinutes}');
  expect((text.match(/\{[a-zA-Z]+\}/g) ?? []).every((p) => ALLOWED.includes(p))).toBe(true);
});

it('limit lines never quote the session length', () => {
  LEVELS.forEach((l) => {
    buildRoastPools(l, quest).limit.forEach((line) => expect(line).not.toContain('{sessionMinutes}'));
    buildRoastPools(l, null).limit.forEach((line) => expect(line).not.toContain('{sessionMinutes}'));
  });
});

it('falls back to usage-only copy without a quest', () => {
  LEVELS.forEach((l) => {
    const pools = buildRoastPools(l, null);
    pools.tiers.forEach((tier) => expect(tier.length).toBeGreaterThan(0));
    const lines = everyLine(l, null);
    lines.forEach((line) => expect(line).not.toMatch(/undefined|null|NaN|\{daysLeft\}/));
  });
});

it('savage copy is not the gentle copy', () => {
  const gentle = everyLine('gentle');
  expect(everyLine('savage').some((line) => !gentle.includes(line))).toBe(true);
});

it('never describes character', () => {
  const text = LEVELS.flatMap((l) => [...everyLine(l), ...everyLine(l, null)]).join('\n').toLowerCase();
  BANNED_PHRASES.forEach((phrase) => expect(text).not.toMatch(new RegExp(`\\b${phrase}\\b`)));
});

it('bakes in nothing that changes with the date', () => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 8, 26));
  const today = LEVELS.map((l) => buildRoastPools(l, quest));
  jest.setSystemTime(new Date(2026, 10, 30));
  const later = LEVELS.map((l) => buildRoastPools(l, quest));
  jest.useRealTimers();
  expect(later).toEqual(today);
});

it('preview fills sample numbers and the real days left', () => {
  LEVELS.forEach((l) => {
    expect(previewLine(l, quest, NOW)).not.toMatch(/\{/);
    expect(previewLine(l, null, NOW)).not.toMatch(/\{/);
  });
});

describe('observationLine', () => {
  it('calls out the most-opened app at five or more opens', () =>
    expect(
      observationLine([
        { pkg: 'yt', label: 'YouTube', minutes: 26, opens: 4 },
        { pkg: 'ig', label: 'Instagram', minutes: 81, opens: 7 },
      ]),
    ).toContain("You've opened Instagram 7 times"));

  it('falls back to time when opens are low', () =>
    expect(observationLine([{ pkg: 'ig', label: 'Instagram', minutes: 40, opens: 2 }])).toContain('40m'));

  it('is null with no usage', () =>
    expect(observationLine([{ pkg: 'ig', label: 'Instagram', minutes: 0, opens: 0 }])).toBeNull());

  it('is null with no apps', () => expect(observationLine([])).toBeNull());
});
