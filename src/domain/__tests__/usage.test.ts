import {
  buildSnapshot,
  dailyMinutes,
  hourlyMinutes,
  minutesByPackage,
  opensByPackage,
  startOfLocalDay,
  toIntervals,
  twoHourBuckets,
  weekChange,
  weekdayLabels,
} from '../usage';

const t = (h: number, m = 0, s = 0, d = 26) => new Date(2026, 8, d, h, m, s).getTime();
const r = (pkg: string, ts: number) => ({ pkg, type: 'resumed' as const, ts });
const p = (pkg: string, ts: number) => ({ pkg, type: 'paused' as const, ts });

describe('toIntervals', () => {
  it('pairs resume and pause into an interval', () =>
    expect(toIntervals([r('ig', t(10)), p('ig', t(10, 30))], t(12))).toEqual([
      { pkg: 'ig', start: t(10), end: t(10, 30) },
    ]));

  it('merges same-app hops shorter than five seconds', () =>
    expect(
      toIntervals([r('ig', t(10)), p('ig', t(10, 10)), r('ig', t(10, 10, 2)), p('ig', t(10, 20))], t(12)),
    ).toEqual([{ pkg: 'ig', start: t(10), end: t(10, 20) }]));

  it('keeps a five-second-or-longer gap as two sessions', () =>
    expect(
      toIntervals([r('ig', t(10)), p('ig', t(10, 10)), r('ig', t(10, 10, 5)), p('ig', t(10, 20))], t(12)),
    ).toHaveLength(2));

  it('closes a still-open session at now', () =>
    expect(toIntervals([r('ig', t(11))], t(11, 15))).toEqual([{ pkg: 'ig', start: t(11), end: t(11, 15) }]));

  it('ignores an orphan pause and a duplicate resume', () =>
    expect(toIntervals([p('ig', t(9)), r('ig', t(10)), r('ig', t(10, 5)), p('ig', t(10, 30))], t(12))).toEqual([
      { pkg: 'ig', start: t(10), end: t(10, 30) },
    ]));

  it('sorts unordered input and keeps apps apart', () =>
    expect(toIntervals([p('yt', t(9, 10)), r('ig', t(10)), r('yt', t(9)), p('ig', t(10, 5))], t(12))).toEqual([
      { pkg: 'yt', start: t(9), end: t(9, 10) },
      { pkg: 'ig', start: t(10), end: t(10, 5) },
    ]));
});

it('counts opens as sessions per app', () =>
  expect(
    opensByPackage(
      toIntervals(
        [r('ig', t(8)), p('ig', t(8, 5)), r('yt', t(9)), p('yt', t(9, 1)), r('ig', t(10)), p('ig', t(10, 5))],
        t(12),
      ),
    ),
  ).toEqual({ ig: 2, yt: 1 }));

it('clips minutes to the window', () =>
  expect(minutesByPackage([{ pkg: 'ig', start: t(23, 30, 0, 25), end: t(0, 30) }], t(0), t(23, 59))).toEqual({
    ig: 30,
  }));

it('splits hourly minutes across hour boundaries', () => {
  const h = hourlyMinutes([{ pkg: 'ig', start: t(10, 40), end: t(11, 25) }], t(0));
  expect(h).toHaveLength(24);
  expect(h[10]).toBeCloseTo(20);
  expect(h[11]).toBeCloseTo(25);
  expect(h[12]).toBe(0);
});

it('returns daily minutes oldest to today', () => {
  const d = dailyMinutes(
    [
      { pkg: 'ig', start: t(20, 0, 0, 25), end: t(20, 30, 0, 25) },
      { pkg: 'ig', start: t(9), end: t(9, 15) },
    ],
    7,
    t(0),
  );
  expect(d).toHaveLength(7);
  expect(d.slice(-2)).toEqual([30, 15]);
});

it('startOfLocalDay is local midnight', () => expect(startOfLocalDay(t(15, 12))).toBe(t(0)));

describe('chart helpers', () => {
  it('folds 24 hours into twelve two-hour buckets', () => {
    const hourly = Array.from({ length: 24 }, (_, h) => (h === 22 ? 30 : h === 23 ? 15 : h === 0 ? 5 : 0));
    const buckets = twoHourBuckets(hourly);
    expect(buckets).toHaveLength(12);
    expect(buckets[0]).toBe(5);
    expect(buckets[11]).toBe(45);
  });

  it('labels the last seven days ending today', () =>
    expect(weekdayLabels(t(0), 7)).toEqual(['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'])); // Sep 26 2026 is a Saturday

  it('reports week-over-week change as a whole percent', () => {
    expect(weekChange(30, 60)).toBe(-50);
    expect(weekChange(90, 60)).toBe(50);
  });

  it('has no change figure without last week or when last week was zero', () => {
    expect(weekChange(30, null)).toBeNull();
    expect(weekChange(30, 0)).toBeNull();
  });
});

describe('buildSnapshot', () => {
  const label = (pkg: string) => pkg.toUpperCase();
  const today = [
    r('ig', t(10)),
    p('ig', t(10, 40)),
    r('yt', t(11)),
    p('yt', t(11, 10)),
    r('ig', t(12)),
    p('ig', t(12, 5)),
  ];

  it('lists every tracked app, zero included, sorted by today minutes', () => {
    const s = buildSnapshot(today, null, ['yt', 'ig', 'rd'], t(13), label);
    expect(s.apps.map((a) => [a.pkg, a.minutes, a.opens])).toEqual([
      ['ig', 45, 2],
      ['yt', 10, 1],
      ['rd', 0, 0],
    ]);
    expect(s.apps[0].label).toBe('IG');
    expect(s.totalToday).toBe(55);
    expect(s.hourly.ig[10]).toBeCloseTo(40);
  });

  it('counts only today in apps even when history is loaded', () => {
    const s = buildSnapshot([r('ig', t(10, 0, 0, 24)), p('ig', t(11, 0, 0, 24)), ...today], null, ['ig'], t(13), label);
    expect(s.apps[0]).toMatchObject({ minutes: 45, opens: 2 });
    expect(s.last7.ig.slice(-3)).toEqual([60, 0, 45]);
  });

  it('has no last-week figure when the history start is unknown', () =>
    expect(buildSnapshot([r('ig', t(9, 0, 0, 16)), p('ig', t(9, 30, 0, 16)), ...today], null, ['ig'], t(13), label).lastWeek).toBeNull());

  it('has no last-week figure when history starts inside the previous week', () =>
    expect(buildSnapshot(today, t(0, 0, 0, 16), ['ig'], t(13), label).lastWeek).toBeNull());

  it('compares against the previous seven days when history covers them', () => {
    const s = buildSnapshot(
      [r('ig', t(9, 0, 0, 16)), p('ig', t(9, 30, 0, 16)), ...today],
      t(0, 0, 0, 12),
      ['ig', 'yt'],
      t(13),
      label,
    );
    expect(s.lastWeek).toBe(30);
    expect(s.thisWeek).toBe(55);
  });
});
