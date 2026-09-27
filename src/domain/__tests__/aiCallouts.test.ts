import { AI_MODEL, AiError, type AiFailure } from '../ai';
import {
  AI_REFRESH_MS,
  AI_RETRY_MS,
  CALLOUT_TOOL,
  aiCalloutSummary,
  buildCalloutRequest,
  calloutBasis,
  parseCalloutResponse,
  shouldRefreshCallouts,
} from '../aiCallouts';
import { createQuest, toggleTask } from '../quests';
import type { AiCalloutSet } from '../types';

const makeId = (() => {
  let n = 0;
  return () => `id${++n}`;
})();
const TODAY = new Date(2026, 8, 27, 10, 0);
const quest = createQuest(
  {
    title: 'Ship the portfolio',
    why: 'Get interviews before March',
    targetDate: '2026-11-30',
    hoursPerWeek: 6,
    milestones: [
      { title: 'Case studies', tasks: [{ title: 'Write the payments case study', minutes: 90 }, { title: 'Pick screenshots', minutes: 20 }] },
      { title: 'Launch', tasks: [{ title: 'Deploy', minutes: 30 }] },
    ],
  },
  TODAY,
  makeId,
);
const everyTaskDone = quest.milestones
  .flatMap((m) => m.tasks)
  .reduce((q, t) => toggleTask(q, t.id, TODAY), quest);

const userText = (req: ReturnType<typeof buildCalloutRequest>) => req.messages[0].content;
const reply = (input: unknown) => ({ content: [{ type: 'tool_use', name: CALLOUT_TOOL, input }] });
const good = (n: number, prefix: string) =>
  Array.from({ length: n }, (_, i) => `${prefix} ${i}: {sessionMinutes} minutes on the feed, "{task}" waits.`);
const failureOf = (fn: () => unknown): AiFailure | null => {
  try {
    fn();
    return null;
  } catch (e) {
    return e instanceof AiError ? e.failure : null;
  }
};

describe('calloutBasis', () => {
  it('stays the same when tasks get ticked, so lines are not rewritten for every tick', () =>
    expect(calloutBasis('normal', everyTaskDone)).toBe(calloutBasis('normal', quest)));

  it.each([
    ['level', calloutBasis('savage', quest)],
    ['title', calloutBasis('normal', { ...quest, title: 'Other' })],
    ['why', calloutBasis('normal', { ...quest, why: 'Other' })],
    ['quest', calloutBasis('normal', { ...quest, id: 'other' })],
  ])('changes with the %s', (_, other) => expect(other).not.toBe(calloutBasis('normal', quest)));
});

describe('buildCalloutRequest', () => {
  it('asks the shared model and forces the callout tool', () => {
    const req = buildCalloutRequest('normal', quest, TODAY);
    expect(req.model).toBe(AI_MODEL);
    expect(req.tool_choice).toEqual({ type: 'tool', name: CALLOUT_TOOL });
  });

  it('describes the quest, where it stands and the tone', () => {
    const text = userText(buildCalloutRequest('savage', quest, TODAY));
    for (const fact of ['Ship the portfolio', 'Get interviews before March', 'Case studies', 'Write the payments case study', '2026-11-30', 'savage']) {
      expect(text).toContain(fact);
    }
  });

  it('names every placeholder the lines may use', () => {
    const text = userText(buildCalloutRequest('normal', quest, TODAY));
    for (const p of ['{goal}', '{task}', '{sessionMinutes}', '{todayMinutes}', '{daysLeft}']) expect(text).toContain(p);
  });

  it('leaves out the why when there is none', () =>
    expect(userText(buildCalloutRequest('normal', { ...quest, why: '' }, TODAY))).not.toMatch(/why/i));

  it('says so when every task is done', () =>
    expect(userText(buildCalloutRequest('normal', everyTaskDone, TODAY))).toMatch(/every task is done/i));
});

describe('parseCalloutResponse', () => {
  it('reads three escalating tiers and the daily-limit lines', () =>
    expect(parseCalloutResponse(reply({ tier1: good(2, 'a'), tier2: good(2, 'b'), tier3: good(2, 'c'), limit: good(1, 'd') }))).toEqual({
      tiers: [good(2, 'a'), good(2, 'b'), good(2, 'c')],
      limit: good(1, 'd'),
    }));

  it('drops lines that would misfire or break the rules', () => {
    const tier1 = [
      ...good(2, 'ok'),
      'Hey {name}, {sessionMinutes} minutes already.',
      'Honestly this is LAZY behaviour, {goal} deserves better.',
      'Too short',
      `${'Far too long. '.repeat(15)}{task}`,
      42,
    ];
    expect(parseCalloutResponse(reply({ tier1, tier2: good(2, 'b'), tier3: good(2, 'c'), limit: good(1, 'd') })).tiers[0]).toEqual(
      good(2, 'ok'),
    );
  });

  it('flattens line breaks and removes duplicates', () => {
    const line = 'Still here after {sessionMinutes} minutes.\n"{task}" is not.';
    const { tiers } = parseCalloutResponse(reply({ tier1: [line, line, ...good(1, 'x')] }));
    expect(tiers[0]).toEqual(['Still here after {sessionMinutes} minutes. "{task}" is not.', ...good(1, 'x')]);
  });

  it('keeps at most 8 lines a tier', () =>
    expect(parseCalloutResponse(reply({ tier1: good(20, 'a') })).tiers[0]).toHaveLength(8));

  it('empties a tier with fewer than two usable lines, so the built-in lines cover it', () =>
    expect(parseCalloutResponse(reply({ tier1: good(3, 'a'), tier2: good(1, 'b'), limit: [] }))).toEqual({
      tiers: [good(3, 'a'), [], []],
      limit: [],
    }));

  it.each([
    ['no tool call', { content: [{ type: 'text', text: 'Sure! Here are some lines.' }] }],
    ['nothing usable', reply({ tier1: ['{oops}'], tier2: [], tier3: 'no', limit: null })],
  ])('rejects a reply with %s', (_, body) => expect(failureOf(() => parseCalloutResponse(body))).toBe('bad-response'));
});

describe('shouldRefreshCallouts', () => {
  const basis = calloutBasis('normal', quest);
  const now = TODAY.getTime();
  const set = (ageMs: number, b = basis): AiCalloutSet => ({
    basis: b,
    createdAt: new Date(now - ageMs).toISOString(),
    tiers: [good(2, 'a'), [], []],
    limit: [],
  });

  it('writes the first batch', () => expect(shouldRefreshCallouts({ set: undefined, basis, now, lastFailure: null })).toBe(true));

  it('rewrites for another quest or level', () =>
    expect(shouldRefreshCallouts({ set: set(60_000, 'other'), basis, now, lastFailure: null })).toBe(true));

  it('keeps a batch that is less than a day old', () =>
    expect(shouldRefreshCallouts({ set: set(AI_REFRESH_MS - 60_000), basis, now, lastFailure: null })).toBe(false));

  it('refreshes a batch that is a day old', () =>
    expect(shouldRefreshCallouts({ set: set(AI_REFRESH_MS), basis, now, lastFailure: null })).toBe(true));

  it('waits before retrying the same quest after a failure', () => {
    expect(shouldRefreshCallouts({ set: undefined, basis, now, lastFailure: { basis, at: now - 60_000 } })).toBe(false);
    expect(shouldRefreshCallouts({ set: undefined, basis, now, lastFailure: { basis, at: now - AI_RETRY_MS } })).toBe(true);
  });

  it('does not let a failure for another quest block this one', () =>
    expect(shouldRefreshCallouts({ set: undefined, basis, now, lastFailure: { basis: 'other', at: now } })).toBe(true));
});

describe('aiCalloutSummary', () => {
  const basis = calloutBasis('normal', quest);
  const base = { on: true, alertsEnabled: true, basis, set: undefined, writing: false };
  const set: AiCalloutSet = { basis, createdAt: new Date(2026, 8, 27, 14, 5).toISOString(), tiers: [[], [], []], limit: [] };

  it.each([
    ['switched off', { on: false }, /built-in lines/],
    ['alerts off', { alertsEnabled: false }, /alerts on/],
    ['no focus quest', { basis: null }, /focus quest/],
    ['a batch being written', { writing: true }, /writing/i],
    ['lines for this quest', { set }, /2:05 PM/],
    ['lines for another quest', { set: { ...set, basis: 'other' } }, /built-in lines until/],
    ['nothing written yet', {}, /built-in lines until/],
  ] as const)('describes %s', (_, over, expected) => expect(aiCalloutSummary({ ...base, ...over })).toMatch(expected));
});
