import { AiError, type AiFailure } from '../../domain/ai';
import { ROADMAP_TOOL, buildRoadmapRequest } from '../../domain/roadmap';
import { CALLOUT_TOOL, buildCalloutRequest } from '../../domain/aiCallouts';
import { createQuest } from '../../domain/quests';
import { ANTHROPIC_URL, requestCallouts, requestRoadmap, type FetchFn } from '../claude';

const TODAY = new Date(2026, 8, 26);
const input = { title: 'Learn Spanish', why: '', targetDate: '2026-12-26', hoursPerWeek: 3 };
const KEY = 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz';

const reply = (status: number, body: unknown): FetchFn => async () => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => {
    if (body instanceof Error) throw body;
    return body;
  },
});

const goodBody = {
  content: [
    {
      type: 'tool_use',
      name: ROADMAP_TOOL,
      input: { milestones: [{ title: 'Basics', tasks: [{ title: 'Learn 50 words', minutes: 40 }] }], note: 'Fine.' },
    },
  ],
};

const failureOf = async (p: Promise<unknown>): Promise<AiFailure | 'other'> => {
  try {
    await p;
    throw new Error('expected a failure');
  } catch (e) {
    return e instanceof AiError ? e.failure : 'other';
  }
};

it('posts the roadmap request with the key and API version', async () => {
  const fetchFn = jest.fn(reply(200, goodBody));
  await requestRoadmap(input, `  ${KEY}\n`, { fetchFn, today: TODAY });
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe(ANTHROPIC_URL);
  expect(init.method).toBe('POST');
  expect(init.headers).toMatchObject({ 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' });
  expect(JSON.parse(init.body)).toEqual(buildRoadmapRequest(input, TODAY));
});

it('returns the parsed roadmap', async () =>
  expect(await requestRoadmap(input, KEY, { fetchFn: reply(200, goodBody), today: TODAY })).toEqual({
    milestones: [{ title: 'Basics', tasks: [{ title: 'Learn 50 words', minutes: 40 }] }],
    note: 'Fine.',
  }));

it('reports a rejected key', async () =>
  expect(await failureOf(requestRoadmap(input, KEY, { fetchFn: reply(401, { error: { message: 'invalid x-api-key' } }) }))).toBe(
    'bad-key',
  ));

it("passes on the API's reason for a rejected request", async () => {
  const err = await requestRoadmap(input, KEY, {
    fetchFn: reply(400, { error: { type: 'invalid_request_error', message: 'Your credit balance is too low.' } }),
  }).catch((e: unknown) => e);
  expect(err).toBeInstanceOf(AiError);
  expect((err as AiError).failure).toBe('rejected');
  expect((err as AiError).detail).toBe('Your credit balance is too low.');
});

it('survives an error page that is not JSON', async () =>
  expect(await failureOf(requestRoadmap(input, KEY, { fetchFn: reply(529, new SyntaxError('Unexpected token <')) }))).toBe(
    'overloaded',
  ));

it('reports a garbled success body', async () =>
  expect(await failureOf(requestRoadmap(input, KEY, { fetchFn: reply(200, new SyntaxError('bad json')) }))).toBe('bad-response'));

it('reports no connection', async () => {
  const fetchFn: FetchFn = async () => {
    throw new TypeError('Network request failed');
  };
  expect(await failureOf(requestRoadmap(input, KEY, { fetchFn }))).toBe('network');
});

/** Behaves like fetch: hangs until aborted, then rejects. */
const hanging: FetchFn = (_url, init) =>
  new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new Error('Aborted'))));

it('gives up after the timeout', async () =>
  expect(await failureOf(requestRoadmap(input, KEY, { fetchFn: hanging, timeoutMs: 10 }))).toBe('timeout'));

/** Headers arrive, then the body stalls until aborted, as a slow stream would. */
const stallingBody: FetchFn = async (_url, init) => ({
  ok: true,
  status: 200,
  json: () => new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new Error('Aborted')))),
});

it('reports a timeout even when the body is what stalls', async () =>
  expect(await failureOf(requestRoadmap(input, KEY, { fetchFn: stallingBody, timeoutMs: 10 }))).toBe('timeout'));

it('stays quiet when the caller cancels mid-body', async () => {
  const controller = new AbortController();
  const pending = requestRoadmap(input, KEY, { fetchFn: stallingBody, signal: controller.signal });
  await new Promise((r) => setTimeout(r, 0));
  controller.abort();
  expect(await failureOf(pending)).toBe('other');
});

it('lets a caller cancel without reporting a failure', async () => {
  const controller = new AbortController();
  const pending = requestRoadmap(input, KEY, { fetchFn: hanging, signal: controller.signal });
  controller.abort();
  expect(await failureOf(pending)).toBe('other');
});

it('requests callout lines for the focus quest and parses them', async () => {
  const quest = createQuest(
    { title: 'Learn Spanish', why: '', targetDate: '2026-12-26', hoursPerWeek: 3, milestones: [{ title: 'M', tasks: [{ title: 'T', minutes: 20 }] }] },
    TODAY,
    () => 'id',
  );
  const lines = ['{sessionMinutes} minutes of feed. {goal} waits.', 'Still here? "{task}" is not.'];
  const fetchFn = jest.fn(reply(200, { content: [{ type: 'tool_use', name: CALLOUT_TOOL, input: { tier1: lines } }] }));
  expect(await requestCallouts('savage', quest, KEY, { fetchFn, today: TODAY })).toEqual({ tiers: [lines, [], []], limit: [] });
  expect(JSON.parse(fetchFn.mock.calls[0][1].body)).toEqual(buildCalloutRequest('savage', quest, TODAY));
});
