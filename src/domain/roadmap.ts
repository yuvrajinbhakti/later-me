import { AI_MODEL, AiError, isRecord, toolInput } from './ai';
import { daysBetween, parseLocalDate, toLocalYmd } from './format';
import type { QuestDraft } from './types';

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
    model: AI_MODEL,
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

const cleanTitle = (v: unknown) => (typeof v === 'string' ? v.trim().slice(0, MAX_TITLE) : '');
const cleanMinutes = (v: unknown) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(600, Math.max(5, Math.round(v))) : null;

/** The model's output is untrusted: anything malformed is dropped rather than shown. */
export function parseRoadmapResponse(body: unknown): Roadmap {
  const input = toolInput(body, ROADMAP_TOOL);
  if (!input || !Array.isArray(input.milestones)) throw new AiError('bad-response');

  const milestones = input.milestones
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
  if (milestones.length === 0) throw new AiError('bad-response');

  const note = typeof input.note === 'string' && input.note.trim() ? input.note.trim() : null;
  return { milestones, note };
}

/** Whether drafting would overwrite anything the user typed. */
export const hasDraftSteps = (milestones: DraftMilestones) =>
  milestones.some((m) => m.title.trim() !== '' || m.tasks.some((t) => t.title.trim() !== ''));
