export const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatMinutes(m: number): string {
  const total = Math.round(m);
  if (total < 60) return `${total}m`;
  const h = Math.floor(total / 60);
  const rest = total % 60;
  return rest === 0 ? `${h}h` : `${h}h ${rest}m`;
}

export function formatPercent(fraction: number): string {
  return String(Math.round(fraction * 100));
}

/** Formatted by hand so Hermes and Node produce the same text regardless of Intl data. */
export function formatDate(d: Date | null): string {
  if (!d) return 'never at this pace';
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function formatClock(d: Date): string {
  const h = d.getHours() % 12 === 0 ? 12 : d.getHours() % 12;
  return `${h}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
}

export function parseLocalDate(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toLocalYmd(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function startOfLocalDay(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Local midnight `days` days away from `ts`; built from calendar fields so DST can't shift it. */
export function dayStartOffset(ts: number, days: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days).getTime();
}

export function monthsFromNow(now: Date, months: number): string {
  return toLocalYmd(new Date(now.getFullYear(), now.getMonth() + months, now.getDate()));
}

/** Whole local calendar days from a to b; rounding absorbs DST's 23/25-hour days. */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfLocalDay(b.getTime()) - startOfLocalDay(a.getTime())) / DAY_MS);
}
