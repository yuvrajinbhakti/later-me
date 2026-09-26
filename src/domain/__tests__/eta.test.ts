import { costOfMinutes, projectQuest } from '../eta';
import { createQuest, toggleTask } from '../quests';
import type { Quest } from '../types';

const makeId = (() => {
  let n = 0;
  return () => `id${++n}`;
})();
const CREATED = new Date(2026, 8, 16, 12, 0);
const NOW = new Date(2026, 8, 26, 12, 0); // 10 days later
const q0 = createQuest(
  {
    title: 'Q',
    why: '',
    targetDate: '2026-10-06',
    hoursPerWeek: 7,
    milestones: [
      { title: 'M', tasks: [1, 2, 3, 4, 5, 6].map((i) => ({ title: `T${i}`, minutes: i === 3 ? 45 : null })) },
    ],
  },
  CREATED,
  makeId,
);
const done = (q: Quest, k: number) =>
  q.milestones[0].tasks.slice(0, k).reduce((acc, t) => toggleTask(acc, t.id, NOW), q);

describe('projectQuest', () => {
  it('extrapolates the ticking pace since creation', () => {
    const p = projectQuest(done(q0, 2), NOW); // 0.2 tasks/day, 4 left → 20 days → Oct 16
    expect(p.projectedDate?.toDateString()).toBe(new Date(2026, 9, 16, 12, 0).toDateString());
    expect(p.daysToTarget).toBe(10); // whole local days: Sep 26 → Oct 6
    expect(p.slipDays).toBe(10); // whole local days: Oct 6 → Oct 16
    expect(p).toMatchObject({ doneTasks: 2, totalTasks: 6 });
  });

  it('projects never when nothing is done', () => {
    const p = projectQuest(q0, NOW);
    expect(p.projectedDate).toBeNull();
    expect(p.slipDays).toBe(0);
  });

  it('projects today with no slip when everything is done', () => {
    const p = projectQuest(done(q0, 6), NOW);
    expect(p.projectedDate?.toDateString()).toBe(NOW.toDateString());
    expect(p.slipDays).toBe(0);
  });

  it('reports no slip when the projection lands before the target', () => {
    expect(projectQuest(done(q0, 5), NOW).slipDays).toBe(0); // 0.5/day, 1 left → Sep 28
  });

  it('counts days past a missed target as negative days to target', () => {
    expect(projectQuest(q0, new Date(2026, 9, 9, 9, 0)).daysToTarget).toBe(-3);
  });
});

describe('costOfMinutes', () => {
  it('prices minutes in the next task estimate and in days of the weekly budget', () => {
    expect(costOfMinutes(81, done(q0, 2))).toEqual({ taskEquivalents: 1.8, taskTitle: 'T3', days: 1.35 });
  });

  it('has no task equivalent when the next task has no estimate', () => {
    expect(costOfMinutes(30, q0)).toMatchObject({ taskEquivalents: null, taskTitle: 'T1' });
  });

  it('has no task when everything is done', () => {
    expect(costOfMinutes(30, done(q0, 6))).toMatchObject({ taskEquivalents: null, taskTitle: null });
  });

  it('returns zero days when the weekly budget is zero', () => {
    expect(costOfMinutes(30, { ...q0, hoursPerWeek: 0 }).days).toBe(0);
  });
});
