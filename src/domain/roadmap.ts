import { daysBetween, parseLocalDate, toLocalYmd } from './format';
import type { QuestDraft } from './types';

export const ROADMAP_MODEL = 'claude-sonnet-5';
export const ROADMAP_TOOL = 'propose_roadmap';

const MAX_MILESTONES = 8;
const MAX_TASKS = 8;
const MAX_TITLE = 120;

export type RoadmapInput = Pick<QuestDraft, 'title' | 'why' | 'targetDate' | 'hoursPerWeek'>;
export type DraftMilestones = QuestDraft['milestones'];

export interface Roadmap {
  milestones: DraftMilestones;
  /** The model's one-line read on whether the timeline is realistic. */
  note: string | null;
}

export function roadmapBudget(input: RoadmapInput, today: Date): { days: number; totalHours: number } {
  const days = Math.max(1, daysBetween(today, parseLocalDate(input.targetDate)));
  return { days, totalHours: Math.round((input.hoursPerWeek * days) / 7) };
}

const SYSTEM = `You plan realistic roadmaps for personal goals.
Break the goal into 3 to 6 milestones, in the order they should happen. Give each milestone 2 to 6 tasks.
Every task is one concrete action someone can finish and tick off in a single sitting. Start it with a verb. Avoid vague tasks such as "research" or "stay consistent" unless they name a clear output.
Estimate minutes for every task, between 15 and 180.
Fit the plan into the time available: keep the total task minutes at or under the hours given. If the goal cannot fit, scope it down to what can and say so in the note.
The note is one or two plain sentences, honest and a little dry, on whether the timeline is realistic.
Write in the same language as the goal.`;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function buildRoadmapRequest(input: RoadmapInput, today: Date) {
  const { days, totalHours } = roadmapBudget(input, today);
  const lines = [
    `Goal: ${input.title.trim()}`,
    input.why.trim() ? `Why it matters: ${input.why.trim()}` : null,
    `Today: ${toLocalYmd(today)}`,
    `Target date: ${input.targetDate} (${plural(days, 'day')} away)`,
    `Time available: ${plural(input.hoursPerWeek, 'hour')} a week, about ${plural(totalHours, 'hour')} in total.`,
  ].filter((line): line is string => line !== null);

  return {
    model: ROADMAP_MODEL,
    max_tokens: 4096,
    system: SYSTEM,
    tools: [
      {
        name: ROADMAP_TOOL,
        description: 'Return the roadmap for the goal.',
        input_schema: {
          type: 'object',
          properties: {
            milestones: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string', description: 'Short milestone name, under 6 words.' },
                  tasks: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        title: { type: 'string', description: 'One concrete action, starting with a verb.' },
                        minutes: { type: 'integer', description: 'Estimated minutes, 15 to 180.' },
                      },
                      required: ['title', 'minutes'],
                    },
                  },
                },
                required: ['title', 'tasks'],
              },
            },
            note: { type: 'string', description: 'One or two sentences on whether the timeline is realistic.' },
          },
          required: ['milestones', 'note'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: ROADMAP_TOOL },
    messages: [{ role: 'user', content: lines.join('\n') }],
  };
}

export type RoadmapFailure = 'bad-key' | 'rate-limit' | 'overloaded' | 'network' | 'timeout' | 'bad-response' | 'rejected';

export class RoadmapError extends Error {
  constructor(
    readonly failure: RoadmapFailure,
    readonly detail?: string,
  ) {
    super(describeFailure(failure, detail));
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const cleanTitle = (v: unknown) => (typeof v === 'string' ? v.trim().slice(0, MAX_TITLE) : '');
const cleanMinutes = (v: unknown) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(600, Math.max(5, Math.round(v))) : null;

/** The model's output is untrusted: anything malformed is dropped rather than shown. */
export function parseRoadmapResponse(body: unknown): Roadmap {
  const content = isRecord(body) && Array.isArray(body.content) ? body.content : [];
  const call = content.find((b) => isRecord(b) && b.type === 'tool_use' && b.name === ROADMAP_TOOL);
  const toolInput = isRecord(call) && isRecord(call.input) ? call.input : null;
  if (!toolInput || !Array.isArray(toolInput.milestones)) throw new RoadmapError('bad-response');

  const milestones = toolInput.milestones
    .filter(isRecord)
    .map((m) => ({
      title: cleanTitle(m.title),
      tasks: (Array.isArray(m.tasks) ? m.tasks : [])
        .filter(isRecord)
        .map((t) => ({ title: cleanTitle(t.title), minutes: cleanMinutes(t.minutes) }))
        .filter((t) => t.title !== '')
        .slice(0, MAX_TASKS),
    }))
    .filter((m) => m.title !== '' && m.tasks.length > 0)
    .slice(0, MAX_MILESTONES);
  if (milestones.length === 0) throw new RoadmapError('bad-response');

  const note = typeof toolInput.note === 'string' && toolInput.note.trim() ? toolInput.note.trim() : null;
  return { milestones, note };
}

export function failureForStatus(status: number): RoadmapFailure {
  if (status === 401 || status === 403) return 'bad-key';
  if (status === 429) return 'rate-limit';
  if (status >= 500) return 'overloaded';
  return 'rejected';
}

export function describeFailure(failure: RoadmapFailure, detail?: string): string {
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
      return 'The draft came back garbled. Try again.';
    case 'rejected':
      return detail ? `Anthropic said: ${detail}` : 'Anthropic rejected the request.';
  }
}

export const isPlausibleApiKey = (key: string) => /^sk-ant-[\w-]{20,}$/.test(key.trim());

export const maskApiKey = (key: string) => `${key.slice(0, 7)}…${key.slice(-4)}`;

/** Whether drafting would overwrite anything the user typed. */
export const hasDraftSteps = (milestones: DraftMilestones) =>
  milestones.some((m) => m.title.trim() !== '' || m.tasks.some((t) => t.title.trim() !== ''));
