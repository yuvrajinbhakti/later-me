import {
  addQuest,
  createQuest,
  currentMilestone,
  deleteQuest,
  emptyState,
  focusQuest,
  milestoneState,
  nextTask,
  questProgress,
  setFocus,
  setQuestStatus,
  todayTasks,
  toggleTask,
  validateDraft,
} from '../quests';
import type { Quest, QuestDraft } from '../types';

const NOW = new Date(2026, 8, 26, 12, 0);
let n = 0;
const makeId = () => `id${++n}`;
beforeEach(() => {
  n = 0;
});

const draft: QuestDraft = {
  title: 'Become a better frontend engineer',
  why: 'Defend my calls',
  targetDate: '2026-12-15',
  hoursPerWeek: 8,
  milestones: [
    { title: 'Foundations', tasks: [{ title: 'Caching', minutes: 45 }, { title: 'Queues', minutes: null }] },
    { title: 'System design', tasks: [{ title: 'Sharding', minutes: 45 }] },
  ],
};
const tick = (q: Quest, mi: number, ti: number) => toggleTask(q, q.milestones[mi].tasks[ti].id, NOW);

describe('createQuest', () => {
  it('builds an active quest with undone tasks', () => {
    const q = createQuest(draft, NOW, makeId);
    expect(q.status).toBe('active');
    expect(q.milestones.map((m) => m.title)).toEqual(['Foundations', 'System design']);
    expect(q.milestones[0].tasks.every((t) => !t.done && t.doneAt === null)).toBe(true);
    expect(q.createdAt).toBe(NOW.toISOString());
    expect(q.completedAt).toBeNull();
  });

  it('trims and drops blank milestones and tasks', () => {
    const q = createQuest(
      {
        ...draft,
        milestones: [
          { title: '  ', tasks: [] },
          { title: ' Real ', tasks: [{ title: ' ', minutes: null }, { title: 'Do it', minutes: 10 }] },
        ],
      },
      NOW,
      makeId,
    );
    expect(q.milestones.map((m) => m.title)).toEqual(['Real']);
    expect(q.milestones[0].tasks.map((t) => t.title)).toEqual(['Do it']);
  });
});

describe('validateDraft', () => {
  it('requires a title', () => expect(validateDraft({ ...draft, title: ' ' })).toBe('Name the goal first.'));
  it('requires a valid target date', () =>
    expect(validateDraft({ ...draft, targetDate: 'nope' })).toBe('Pick a target date.'));
  it('requires a milestone with a task', () =>
    expect(validateDraft({ ...draft, milestones: [{ title: 'A', tasks: [] }] })).toBe(
      'Add at least one milestone with one task.',
    ));
  it('accepts a complete draft', () => expect(validateDraft(draft)).toBeNull());
});

describe('progress and position', () => {
  it('progress is ticked over total tasks', () => {
    expect(questProgress(tick(createQuest(draft, NOW, makeId), 0, 0))).toBeCloseTo(1 / 3);
  });

  it('progress is zero with no tasks', () => {
    expect(questProgress({ ...createQuest(draft, NOW, makeId), milestones: [] })).toBe(0);
  });

  it('current milestone advances when its last task is ticked', () => {
    let q = createQuest(draft, NOW, makeId);
    expect(currentMilestone(q)?.title).toBe('Foundations');
    q = tick(tick(q, 0, 0), 0, 1);
    expect(currentMilestone(q)?.title).toBe('System design');
    expect(milestoneState(q, q.milestones[0])).toBe('done');
    expect(milestoneState(q, q.milestones[1])).toBe('current');
  });

  it('upcoming milestones are neither done nor current', () => {
    const q = createQuest(draft, NOW, makeId);
    expect(milestoneState(q, q.milestones[1])).toBe('upcoming');
  });

  it('today shows up to three undone tasks of the current milestone', () => {
    expect(todayTasks(createQuest(draft, NOW, makeId)).map((t) => t.title)).toEqual(['Caching', 'Queues']);
  });

  it('ticking stamps doneAt and ticking again clears it', () => {
    const once = tick(createQuest(draft, NOW, makeId), 0, 0);
    expect(once.milestones[0].tasks[0]).toMatchObject({ done: true, doneAt: NOW.toISOString() });
    expect(tick(once, 0, 0).milestones[0].tasks[0]).toMatchObject({ done: false, doneAt: null });
  });

  it('next task and current milestone are null when everything is done', () => {
    const q = tick(tick(tick(createQuest(draft, NOW, makeId), 0, 0), 0, 1), 1, 0);
    expect(nextTask(q)).toBeNull();
    expect(currentMilestone(q)).toBeNull();
    expect(todayTasks(q)).toEqual([]);
  });
});

describe('focus rules', () => {
  const three = () =>
    [new Date(2026, 0, 1), new Date(2026, 1, 1), new Date(2026, 2, 1)].map((d) => createQuest(draft, d, makeId));

  it('the first quest becomes focus and later ones do not steal it', () => {
    const [a, b] = three();
    const s = [a, b].reduce(addQuest, emptyState());
    expect(s.focusQuestId).toBe(a.id);
    expect(focusQuest(s)?.id).toBe(a.id);
  });

  it('pausing focus hands it to the most recently created active quest', () => {
    const [a, b, c] = three();
    const s = setQuestStatus([a, b, c].reduce(addQuest, emptyState()), a.id, 'paused', NOW);
    expect(s.focusQuestId).toBe(c.id);
  });

  it('completing the only quest leaves no focus and stamps completedAt', () => {
    const [a] = three();
    const s = setQuestStatus(addQuest(emptyState(), a), a.id, 'completed', NOW);
    expect(s.focusQuestId).toBeNull();
    expect(s.quests[0].completedAt).toBe(NOW.toISOString());
  });

  it('deleting removes the quest and reassigns focus', () => {
    const [a, b] = three();
    const s = deleteQuest([a, b].reduce(addQuest, emptyState()), a.id);
    expect(s.quests.map((q) => q.id)).toEqual([b.id]);
    expect(s.focusQuestId).toBe(b.id);
  });

  it('resuming a quest when nothing is in focus makes it focus', () => {
    const [a] = three();
    let s = setQuestStatus(addQuest(emptyState(), a), a.id, 'paused', NOW);
    s = setQuestStatus(s, a.id, 'active', NOW);
    expect(s.focusQuestId).toBe(a.id);
    expect(s.quests[0].completedAt).toBeNull();
  });

  it('setFocus ignores quests that are not active', () => {
    const [a, b] = three();
    let s = setQuestStatus([a, b].reduce(addQuest, emptyState()), b.id, 'paused', NOW);
    s = setFocus(s, b.id);
    expect(s.focusQuestId).toBe(a.id);
  });

  it('setFocus moves focus to another active quest', () => {
    const [a, b] = three();
    expect(setFocus([a, b].reduce(addQuest, emptyState()), b.id).focusQuestId).toBe(b.id);
  });
});
