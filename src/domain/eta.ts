import { DAY_MS, daysBetween, parseLocalDate } from './format';
import { allTasks, nextTask } from './quests';
import type { Quest } from './types';

export interface Projection {
  doneTasks: number;
  totalTasks: number;
  daysToTarget: number;
  projectedDate: Date | null;
  slipDays: number;
}

/** Deliberately crude: extrapolates the ticking pace since the quest was created. */
export function projectQuest(q: Quest, now: Date): Projection {
  const tasks = allTasks(q);
  const doneTasks = tasks.filter((t) => t.done).length;
  const totalTasks = tasks.length;
  const remaining = totalTasks - doneTasks;
  const target = parseLocalDate(q.targetDate);
  const elapsedDays = Math.max((now.getTime() - new Date(q.createdAt).getTime()) / DAY_MS, 0.5);
  const pace = doneTasks / elapsedDays;

  let projectedDate: Date | null = null;
  if (remaining === 0) projectedDate = now;
  else if (pace > 0) projectedDate = new Date(now.getTime() + (remaining / pace) * DAY_MS);

  return {
    doneTasks,
    totalTasks,
    daysToTarget: daysBetween(now, target),
    projectedDate,
    slipDays: projectedDate ? Math.max(daysBetween(target, projectedDate), 0) : 0,
  };
}

const round = (value: number, dp: number) => Math.round(value * 10 ** dp) / 10 ** dp;

export function costOfMinutes(
  minutes: number,
  q: Quest,
): { taskEquivalents: number | null; taskTitle: string | null; days: number } {
  const task = nextTask(q);
  const dailyBudget = (q.hoursPerWeek * 60) / 7;
  return {
    taskEquivalents: task?.minutes ? round(minutes / task.minutes, 1) : null,
    taskTitle: task?.title ?? null,
    days: dailyBudget > 0 ? round(minutes / dailyBudget, 2) : 0,
  };
}
