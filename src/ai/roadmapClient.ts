import {
  RoadmapError,
  buildRoadmapRequest,
  failureForStatus,
  parseRoadmapResponse,
  type Roadmap,
  type RoadmapInput,
} from '../domain/roadmap';

export const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

/** The slice of fetch this client uses, so tests can stand in for the network. */
export type FetchFn = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string; signal: AbortSignal },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

interface RequestOptions {
  fetchFn?: FetchFn;
  today?: Date;
  timeoutMs?: number;
  /** Aborting this rejects with a plain error, not a RoadmapError, so a closed screen shows nothing. */
  signal?: AbortSignal;
}

const errorMessage = (body: unknown): string | undefined => {
  const error = typeof body === 'object' && body !== null ? (body as { error?: { message?: unknown } }).error : undefined;
  return typeof error?.message === 'string' ? error.message : undefined;
};

export async function requestRoadmap(input: RoadmapInput, apiKey: string, options: RequestOptions = {}): Promise<Roadmap> {
  const { fetchFn = fetch, today = new Date(), timeoutMs = 90_000, signal } = options;
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel);

  try {
    let res: Awaited<ReturnType<FetchFn>>;
    try {
      res = await fetchFn(ANTHROPIC_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': apiKey.trim(), 'anthropic-version': '2023-06-01' },
        body: JSON.stringify(buildRoadmapRequest(input, today)),
        signal: controller.signal,
      });
    } catch (e) {
      if (signal?.aborted) throw e;
      throw new RoadmapError(timedOut ? 'timeout' : 'network');
    }

    const body = await res.json().catch(() => undefined);
    // An abort while the body streams in surfaces as an unreadable body, not as a fetch rejection.
    if (signal?.aborted) throw new Error('Aborted');
    if (timedOut) throw new RoadmapError('timeout');
    if (!res.ok) throw new RoadmapError(failureForStatus(res.status), errorMessage(body));
    return parseRoadmapResponse(body);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}
