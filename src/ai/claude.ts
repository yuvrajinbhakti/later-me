import { AiError, failureForStatus } from '../domain/ai';
import { buildCalloutRequest, parseCalloutResponse } from '../domain/aiCallouts';
import { buildRoadmapRequest, parseRoadmapResponse, type Roadmap, type RoadmapInput } from '../domain/roadmap';
import type { AiCalloutSet, Quest, SarcasmLevel } from '../domain/types';

export const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

/** The slice of fetch this client uses, so tests can stand in for the network. */
export type FetchFn = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string; signal: AbortSignal },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export interface RequestOptions {
  fetchFn?: FetchFn;
  today?: Date;
  timeoutMs?: number;
  /** Aborting this rejects with a plain error, not an AiError, so a closed screen shows nothing. */
  signal?: AbortSignal;
}

const errorMessage = (body: unknown): string | undefined => {
  const error = typeof body === 'object' && body !== null ? (body as { error?: { message?: unknown } }).error : undefined;
  return typeof error?.message === 'string' ? error.message : undefined;
};

/** Sends one Messages API request and hands the reply to `parse`; every failure becomes an AiError. */
export async function requestClaude<T>(
  request: object,
  parse: (body: unknown) => T,
  apiKey: string,
  options: RequestOptions = {},
): Promise<T> {
  const { fetchFn = fetch, timeoutMs = 90_000, signal } = options;
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
        body: JSON.stringify(request),
        signal: controller.signal,
      });
    } catch (e) {
      if (signal?.aborted) throw e;
      throw new AiError(timedOut ? 'timeout' : 'network');
    }

    const body = await res.json().catch(() => undefined);
    // An abort while the body streams in surfaces as an unreadable body, not as a fetch rejection.
    if (signal?.aborted) throw new Error('Aborted');
    if (timedOut) throw new AiError('timeout');
    if (!res.ok) throw new AiError(failureForStatus(res.status), errorMessage(body));
    return parse(body);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}

export const requestRoadmap = (input: RoadmapInput, apiKey: string, options: RequestOptions = {}): Promise<Roadmap> =>
  requestClaude(buildRoadmapRequest(input, options.today ?? new Date()), parseRoadmapResponse, apiKey, options);

export const requestCallouts = (
  level: SarcasmLevel,
  quest: Quest,
  apiKey: string,
  options: RequestOptions = {},
): Promise<Pick<AiCalloutSet, 'tiers' | 'limit'>> =>
  requestClaude(buildCalloutRequest(level, quest, options.today ?? new Date()), parseCalloutResponse, apiKey, options);
