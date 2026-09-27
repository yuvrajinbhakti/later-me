/** What every Claude-backed feature shares: the model, failures, key handling and tool-call parsing. */

export const AI_MODEL = 'claude-sonnet-5';

export type AiFailure = 'bad-key' | 'rate-limit' | 'overloaded' | 'network' | 'timeout' | 'bad-response' | 'rejected';

export class AiError extends Error {
  constructor(
    readonly failure: AiFailure,
    readonly detail?: string,
  ) {
    super(describeFailure(failure, detail));
  }
}

export function failureForStatus(status: number): AiFailure {
  if (status === 401 || status === 403) return 'bad-key';
  if (status === 429) return 'rate-limit';
  if (status >= 500) return 'overloaded';
  return 'rejected';
}

export function describeFailure(failure: AiFailure, detail?: string): string {
  switch (failure) {
    case 'bad-key':
      return "Anthropic didn't accept that API key. Check it in Accountability.";
    case 'rate-limit':
      return 'Too many requests. Try again in a minute.';
    case 'overloaded':
      return 'Anthropic is busy right now. Try again shortly.';
    case 'network':
      return "Couldn't reach Anthropic. Check your connection.";
    case 'timeout':
      return 'That took too long. Try again.';
    case 'bad-response':
      return 'The reply came back garbled. Try again.';
    case 'rejected':
      return detail ? `Anthropic said: ${detail}` : 'Anthropic rejected the request.';
  }
}

export const isPlausibleApiKey = (key: string) => /^sk-ant-[\w-]{20,}$/.test(key.trim());

export const maskApiKey = (key: string) => `${key.slice(0, 7)}…${key.slice(-4)}`;

export const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** The input of the named forced tool call in a Messages API reply, or null when there is none. */
export function toolInput(body: unknown, tool: string): Record<string, unknown> | null {
  const content = isRecord(body) && Array.isArray(body.content) ? body.content : [];
  const call = content.find((b) => isRecord(b) && b.type === 'tool_use' && b.name === tool);
  return isRecord(call) && isRecord(call.input) ? call.input : null;
}
