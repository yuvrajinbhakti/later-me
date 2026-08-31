import { Goal } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface EtaProjection {
  /** Days until the user's own deadline (negative = past due). */
  daysToTarget: number;
  /** Projected finish date at the current pace, or null if pace is zero. */
  projectedDate: Date | null;
  /** Days the projection lands past the deadline (0 if on track). */
  slipDays: number;
  /** Days of goal-work a given number of wasted minutes costs. */
  daysLostTo: (wastedMinutes: number) => number;
}

/**
 * Deliberately crude pace math — this exists to power roasts, not science.
 * Pace = steps done per elapsed day since the goal was created; projection
 * extrapolates the remaining steps at that pace.
 */
export function projectEta(goal: Goal, now: Date = new Date()): EtaProjection {
  const created = new Date(goal.createdAt).getTime();
  const target = new Date(goal.targetDate).getTime();
  const elapsedDays = Math.max((now.getTime() - created) / DAY_MS, 0.5);
  const daysToTarget = Math.round((target - now.getTime()) / DAY_MS);

  const stepsRemaining = Math.max(goal.stepsTotal - goal.stepsDone, 0);
  const pace = goal.stepsDone / elapsedDays; // steps per day

  let projectedDate: Date | null = null;
  let slipDays = 0;
  if (stepsRemaining === 0) {
    projectedDate = now;
  } else if (pace > 0) {
    projectedDate = new Date(now.getTime() + (stepsRemaining / pace) * DAY_MS);
    slipDays = Math.max(Math.round((projectedDate.getTime() - target) / DAY_MS), 0);
  }
  // pace === 0 → projectedDate stays null ("never", prime roast material)

  const dailyBudgetMinutes = (goal.hoursPerWeek * 60) / 7;
  const daysLostTo = (wastedMinutes: number) =>
    dailyBudgetMinutes > 0 ? wastedMinutes / dailyBudgetMinutes : 0;

  return { daysToTarget, projectedDate, slipDays, daysLostTo };
}

export function formatDate(d: Date | null): string {
  if (!d) return 'never (at this rate)';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
