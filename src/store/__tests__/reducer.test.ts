import { reducer } from '../reducer';
import { createQuest, emptyState } from '../../domain/quests';

const NOW = new Date(2026, 8, 26, 12, 0);
beforeAll(() => jest.useFakeTimers().setSystemTime(NOW));
afterAll(() => jest.useRealTimers());

const makeId = (() => {
  let n = 0;
  return () => `id${++n}`;
})();
const q = createQuest(
  {
    title: 'A',
    why: '',
    targetDate: '2026-12-01',
    hoursPerWeek: 5,
    milestones: [{ title: 'M', tasks: [{ title: 'T', minutes: null }] }],
  },
  NOW,
  makeId,
);
const withQuest = reducer(emptyState(), { type: 'addQuest', quest: q });
const taskId = q.milestones[0].tasks[0].id;

it('hydrate replaces state', () => expect(reducer(emptyState(), { type: 'hydrate', state: withQuest })).toBe(withQuest));

it('addQuest adds and focuses the first quest', () => {
  expect(withQuest.quests).toHaveLength(1);
  expect(withQuest.focusQuestId).toBe(q.id);
});

it('toggleTask ticks the task with the current time', () =>
  expect(reducer(withQuest, { type: 'toggleTask', questId: q.id, taskId }).quests[0].milestones[0].tasks[0]).toMatchObject({
    done: true,
    doneAt: NOW.toISOString(),
  }));

it('setFocus delegates to the focus rules', () => {
  const other = createQuest({ ...q, milestones: [{ title: 'M', tasks: [{ title: 'T', minutes: null }] }] }, NOW, makeId);
  const two = reducer(withQuest, { type: 'addQuest', quest: other });
  expect(reducer(two, { type: 'setFocus', questId: other.id }).focusQuestId).toBe(other.id);
});

it('setStatus pauses and drops focus', () =>
  expect(reducer(withQuest, { type: 'setStatus', questId: q.id, status: 'paused' }).focusQuestId).toBeNull());

it('deleteQuest removes it', () => expect(reducer(withQuest, { type: 'deleteQuest', questId: q.id }).quests).toEqual([]));

it('updateSettings merges a patch', () =>
  expect(reducer(withQuest, { type: 'updateSettings', patch: { sarcasmLevel: 'savage' } }).settings).toMatchObject({
    sarcasmLevel: 'savage',
    alertsEnabled: true,
  }));

it('unknown quest ids leave state unchanged', () => {
  expect(reducer(withQuest, { type: 'toggleTask', questId: 'nope', taskId: 'x' })).toBe(withQuest);
  expect(reducer(withQuest, { type: 'setStatus', questId: 'nope', status: 'paused' })).toBe(withQuest);
  expect(reducer(withQuest, { type: 'deleteQuest', questId: 'nope' })).toBe(withQuest);
});

it('setAiCallouts stores the latest batch of lines', () => {
  const set = { basis: 'b', createdAt: NOW.toISOString(), tiers: [['line one here'], [], []], limit: [] };
  expect(reducer(withQuest, { type: 'setAiCallouts', set }).aiCallouts).toBe(set);
});
