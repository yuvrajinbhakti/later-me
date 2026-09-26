import type { UsageEventRecord } from '../../modules/usage-stats';
import { dayStartOffset, startOfLocalDay } from './format';
import type { AppUsage } from './types';

export type RawUsageEvent = UsageEventRecord;
export { startOfLocalDay };

export interface Interval {
  pkg: string;
  start: number;
  end: number;
}

export interface UsageSnapshotData {
  apps: AppUsage[];
  totalToday: number;
  hourly: Record<string, number[]>;
  last7: Record<string, number[]>;
  thisWeek: number;
  lastWeek: number | null;
}

/** Activity hops inside one app pause and resume within milliseconds; treat them as one session. */
export const MERGE_GAP_MS = 5000;
const MINUTE_MS = 60_000;

export function toIntervals(events: RawUsageEvent[], now: number): Interval[] {
  const raw: Interval[] = [];
  const open = new Map<string, number>();
  for (const e of [...events].sort((a, b) => a.ts - b.ts)) {
    if (e.type === 'resumed') {
      if (!open.has(e.pkg)) open.set(e.pkg, e.ts);
    } else {
      const start = open.get(e.pkg);
      if (start !== undefined) {
        raw.push({ pkg: e.pkg, start, end: e.ts });
        open.delete(e.pkg);
      }
    }
  }
  open.forEach((start, pkg) => raw.push({ pkg, start, end: now }));

  const byPkg = new Map<string, Interval[]>();
  raw.forEach((i) => {
    const list = byPkg.get(i.pkg);
    if (list) list.push(i);
    else byPkg.set(i.pkg, [i]);
  });
  const merged: Interval[] = [];
  byPkg.forEach((list) => {
    list.sort((a, b) => a.start - b.start);
    let cur = { ...list[0] };
    for (const next of list.slice(1)) {
      if (next.start - cur.end < MERGE_GAP_MS) cur.end = Math.max(cur.end, next.end);
      else {
        merged.push(cur);
        cur = { ...next };
      }
    }
    merged.push(cur);
  });
  return merged.sort((a, b) => a.start - b.start);
}

const overlapMinutes = (i: Interval, from: number, to: number) =>
  Math.max(0, Math.min(i.end, to) - Math.max(i.start, from)) / MINUTE_MS;

export function opensByPackage(intervals: Interval[]): Record<string, number> {
  const out: Record<string, number> = {};
  intervals.forEach((i) => (out[i.pkg] = (out[i.pkg] ?? 0) + 1));
  return out;
}

export function minutesByPackage(intervals: Interval[], from: number, to: number): Record<string, number> {
  const out: Record<string, number> = {};
  intervals.forEach((i) => {
    const m = overlapMinutes(i, from, to);
    if (m > 0) out[i.pkg] = (out[i.pkg] ?? 0) + m;
  });
  return out;
}

const sumWindow = (intervals: Interval[], from: number, to: number) =>
  intervals.reduce((sum, i) => sum + overlapMinutes(i, from, to), 0);

export function hourlyMinutes(intervals: Interval[], dayStart: number): number[] {
  const d = new Date(dayStart);
  return Array.from({ length: 24 }, (_, h) => {
    const from = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h).getTime();
    const to = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h + 1).getTime();
    return sumWindow(intervals, from, to);
  });
}

export function dailyMinutes(intervals: Interval[], days: number, todayStart: number): number[] {
  return Array.from({ length: days }, (_, idx) => {
    const offset = idx - (days - 1);
    return sumWindow(intervals, dayStartOffset(todayStart, offset), dayStartOffset(todayStart, offset + 1));
  });
}

export function twoHourBuckets(hourly: number[]): number[] {
  return Array.from({ length: 12 }, (_, i) => (hourly[i * 2] ?? 0) + (hourly[i * 2 + 1] ?? 0));
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/** Oldest to today, matching dailyMinutes. */
export function weekdayLabels(todayStart: number, days: number): string[] {
  return Array.from({ length: days }, (_, idx) => WEEKDAYS[new Date(dayStartOffset(todayStart, idx - (days - 1))).getDay()]);
}

export function weekChange(thisWeek: number, lastWeek: number | null): number | null {
  if (lastWeek === null || lastWeek <= 0) return null;
  return Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
}

export function buildSnapshot(
  events: RawUsageEvent[],
  historyStartMs: number | null,
  packages: string[],
  now: number,
  label: (pkg: string) => string,
): UsageSnapshotData {
  const tracked = new Set(packages);
  const intervals = toIntervals(events, now).filter((i) => tracked.has(i.pkg));
  const todayStart = startOfLocalDay(now);
  const todayMinutes = minutesByPackage(intervals, todayStart, now);
  const todayOpens = opensByPackage(intervals.filter((i) => i.start >= todayStart));

  const apps = packages
    .map<AppUsage>((pkg) => ({ pkg, label: label(pkg), minutes: todayMinutes[pkg] ?? 0, opens: todayOpens[pkg] ?? 0 }))
    .sort((a, b) => b.minutes - a.minutes);

  const hourly: Record<string, number[]> = {};
  const last7: Record<string, number[]> = {};
  packages.forEach((pkg) => {
    const own = intervals.filter((i) => i.pkg === pkg);
    hourly[pkg] = hourlyMinutes(own, todayStart);
    last7[pkg] = dailyMinutes(own, 7, todayStart);
  });

  const weekStart = dayStartOffset(todayStart, -6);
  const prevWeekStart = dayStartOffset(todayStart, -13);
  const lastWeek =
    historyStartMs !== null && historyStartMs <= prevWeekStart ? sumWindow(intervals, prevWeekStart, weekStart) : null;

  return {
    apps,
    totalToday: apps.reduce((sum, a) => sum + a.minutes, 0),
    hourly,
    last7,
    thisWeek: sumWindow(intervals, weekStart, now),
    lastWeek,
  };
}
