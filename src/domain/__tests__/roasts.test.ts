import { buildRoastPools, observationLine, previewLine } from '../roasts';
import { BANNED_PHRASES } from '../tone';
import { calloutBasis } from '../aiCallouts';
import { createQuest, toggleTask } from '../quests';
import type { AiCalloutSet, Quest, SarcasmLevel } from '../types';

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

it('names the quest instead of quoting a placeholder when every task is ticked', () => {
  const doneQuest = toggleTask(quest, quest.milestones[0].tasks[0].id, NOW);
  LEVELS.forEach((l) => {
    const text = everyLine(l, doneQuest).join('\n');
    expect(text).not.toContain('your next step');
    expect(text).toContain('Become a better frontend engineer');
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

describe('with AI-written lines', () => {
  const ai = (over: Partial<AiCalloutSet> = {}): AiCalloutSet => ({
    basis: calloutBasis('normal', quest),
    createdAt: NOW.toISOString(),
    tiers: [
      ['{goal} is waiting. {sessionMinutes} minutes of feed so far.', '"{task}" beats reel number {todayMinutes}.'],
      [],
      ['Third time. {daysLeft} days left for "{task}".', 'Put it down. {goal} will not do itself.'],
    ],
    limit: [],
    ...over,
  });

  it('uses them, filling in the goal and next task but leaving the live numbers', () =>
    expect(buildRoastPools('normal', quest, ai()).tiers[0]).toEqual([
      'Become a better frontend engineer is waiting. {sessionMinutes} minutes of feed so far.',
      '"Learn sharding" beats reel number {todayMinutes}.',
    ]));

  it('keeps the built-in lines for any tier the AI left empty', () => {
    const pools = buildRoastPools('normal', quest, ai());
    expect(pools.tiers[1]).toEqual(buildRoastPools('normal', quest).tiers[1]);
    expect(pools.limit).toEqual(buildRoastPools('normal', quest).limit);
  });

  it('ignores lines written for another quest or level', () => {
    expect(buildRoastPools('savage', quest, ai())).toEqual(buildRoastPools('savage', quest));
    expect(buildRoastPools('normal', quest, ai({ basis: 'stale' }))).toEqual(buildRoastPools('normal', quest));
  });

  it('ignores them without a focus quest', () => expect(buildRoastPools('normal', null, ai())).toEqual(buildRoastPools('normal', null)));

  it('previews the first AI line', () =>
    expect(previewLine('normal', quest, NOW, ai())).toBe('Become a better frontend engineer is waiting. 17 minutes of feed so far.'));
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
