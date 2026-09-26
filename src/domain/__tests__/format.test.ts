import { daysBetween, formatDate, formatMinutes, formatPercent, parseLocalDate, toLocalYmd } from '../format';

describe('formatMinutes', () => {
  it.each<[number, string]>([
    [81, '1h 21m'],
    [60, '1h'],
    [26, '26m'],
    [0.4, '0m'],
    [0, '0m'],
    [59.6, '1h'],
  ])('formats %p minutes as %p', (m, s) => expect(formatMinutes(m)).toBe(s));
});

it('formatPercent rounds to a whole percent', () => expect(formatPercent(0.425)).toBe('43'));
it('formatDate names a date', () => expect(formatDate(new Date(2026, 11, 15))).toBe('Dec 15, 2026'));
it('formatDate handles never', () => expect(formatDate(null)).toBe('never at this pace'));

it('parseLocalDate is local midnight', () => {
  const d = parseLocalDate('2026-12-15');
  expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 11, 15, 0]);
});

it('toLocalYmd formats local calendar date', () => expect(toLocalYmd(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05'));

it('daysBetween counts whole local days regardless of time of day', () =>
  expect(daysBetween(new Date(2026, 8, 26, 23, 0), new Date(2026, 9, 6, 1, 0))).toBe(10));
