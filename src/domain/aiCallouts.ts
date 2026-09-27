import { AI_MODEL, AiError, toolInput } from './ai';
import { DAY_MS, daysBetween, formatClock, parseLocalDate } from './format';
import { currentMilestone, nextTask } from './quests';
import { BANNED_PHRASES } from './tone';
import type { AiCalloutSet, Quest, SarcasmLevel } from './types';

export const CALLOUT_TOOL = 'write_callouts';
export const AI_REFRESH_MS = DAY_MS;
export const AI_RETRY_MS = 30 * 60 * 1000;

const PLACEHOLDERS = ['{goal}', '{task}', '{sessionMinutes}', '{todayMinutes}', '{daysLeft}'];
const MIN_LINE = 10;
const MAX_LINE = 160;
const MAX_PER_TIER = 8;

/** What the lines were written from. Ticking tasks leaves it alone because the next task is a placeholder. */
export const calloutBasis = (level: SarcasmLevel, quest: Quest) => JSON.stringify([quest.id, level, quest.title, quest.why]);

const TONE: Record<SarcasmLevel, string> = {
  gentle: "Warm and encouraging, a friend's nudge. No sarcasm, no guilt.",
  normal: 'Dry and witty, a raised eyebrow. Teasing about the scrolling, never mean.',
  savage: 'Blunt and cutting about the scrolling itself. Hard-hitting, but never about who they are.',
};

const SYSTEM = `You write the short callouts Later Me shows when someone has been doom-scrolling instead of working on their goal.
Rules for every line:
- Speak to them directly in one or two short sentences, under 140 characters.
- Criticise the scrolling, never the person: nothing about their character, intelligence, looks, body, health or worth. No profanity. Never mention self-harm.
- Make it specific to their goal, not generic productivity advice.
- Use only the placeholders listed, spelled exactly, and no other curly braces.
tier1 is the first callout in a scrolling session. tier2 comes after they dismissed it and kept scrolling. tier3 is the third time or later and the sharpest. limit fires once when they cross their daily limit.
Write 6 lines for tier1, 5 for tier2, 5 for tier3 and 4 for limit. Vary how the lines open.
Write in the same language as the goal.`;

export function buildCalloutRequest(level: SarcasmLevel, quest: Quest, today: Date) {
  const milestone = currentMilestone(quest);
  const task = nextTask(quest);
  const daysLeft = Math.max(0, daysBetween(today, parseLocalDate(quest.targetDate)));
  const lines = [
    `Goal: ${quest.title}`,
    quest.why.trim() ? `Why it matters to them: ${quest.why.trim()}` : null,
    milestone ? `Current milestone: ${milestone.title}` : null,
    task
      ? `Next task right now: ${task.title}. It changes as tasks get ticked, so write {task} rather than naming it.`
      : 'Every task is done; {task} will show the goal instead.',
    `Target date: ${quest.targetDate}, ${daysLeft} days away.`,
    `Tone: ${level}. ${TONE[level]}`,
    '',
    'Placeholders, filled in when a callout shows:',
    '{goal} the goal above',
    '{task} their next task',
    '{sessionMinutes} minutes scrolled in this session',
    "{todayMinutes} minutes scrolled today in the apps they're tracking",
    '{daysLeft} days until the target date',
  ].filter((line): line is string => line !== null);

  const tier = (description: string) => ({ type: 'array', items: { type: 'string' }, description });
  return {
    model: AI_MODEL,
    max_tokens: 2048,
    system: SYSTEM,
    tools: [
      {
        name: CALLOUT_TOOL,
        description: 'Return the callout lines.',
        input_schema: {
          type: 'object',
          properties: {
            tier1: tier('First callout of a session.'),
            tier2: tier('They dismissed it and kept scrolling.'),
            tier3: tier('Third time or later; the sharpest.'),
            limit: tier('They crossed their daily limit.'),
          },
          required: ['tier1', 'tier2', 'tier3', 'limit'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: CALLOUT_TOOL },
    messages: [{ role: 'user', content: lines.join('\n') }],
  };
}

function cleanLine(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const line = v.replace(/\s+/g, ' ').trim();
  if (line.length < MIN_LINE || line.length > MAX_LINE) return null;
  // An unknown placeholder would reach the screen as literal braces.
  if (/[{}]/.test(PLACEHOLDERS.reduce((rest, p) => rest.split(p).join(''), line))) return null;
  const lower = line.toLowerCase();
  if (BANNED_PHRASES.some((phrase) => lower.includes(phrase))) return null;
  return line;
}

function cleanTier(v: unknown, minLines: number): string[] {
  const lines = (Array.isArray(v) ? v : []).map(cleanLine).filter((l): l is string => l !== null);
  const unique = [...new Set(lines)].slice(0, MAX_PER_TIER);
  return unique.length >= minLines ? unique : [];
}

/** Lines are untrusted: each must fit, use only known placeholders and pass the banned-phrase list. */
export function parseCalloutResponse(body: unknown): Pick<AiCalloutSet, 'tiers' | 'limit'> {
  const input = toolInput(body, CALLOUT_TOOL);
  if (!input) throw new AiError('bad-response');
  const tiers = [cleanTier(input.tier1, 2), cleanTier(input.tier2, 2), cleanTier(input.tier3, 2)];
  const limit = cleanTier(input.limit, 1);
  if (tiers.every((t) => t.length === 0) && limit.length === 0) throw new AiError('bad-response');
  return { tiers, limit };
}

export function shouldRefreshCallouts(args: {
  set: AiCalloutSet | undefined;
  basis: string;
  now: number;
  lastFailure: { basis: string; at: number } | null;
}): boolean {
  const { set, basis, now, lastFailure } = args;
  if (lastFailure && lastFailure.basis === basis && now - lastFailure.at < AI_RETRY_MS) return false;
  if (!set || set.basis !== basis) return true;
  // Written this way so an unparseable createdAt counts as stale rather than fresh forever.
  return !(now - Date.parse(set.createdAt) < AI_REFRESH_MS);
}

/** One line for the settings screen on what the watcher is saying right now. */
export function aiCalloutSummary(args: {
  on: boolean;
  alertsEnabled: boolean;
  basis: string | null;
  set: AiCalloutSet | undefined;
  writing: boolean;
}): string {
  const { on, alertsEnabled, basis, set, writing } = args;
  if (!on) return 'Using the built-in lines.';
  if (!alertsEnabled) return 'Turn distraction alerts on to use them.';
  if (basis === null) return 'Pick a focus quest first.';
  if (writing) return 'Writing new lines for your focus quest…';
  if (set?.basis === basis) return `Lines written at ${formatClock(new Date(set.createdAt))}. Fresh ones daily.`;
  return 'Using the built-in lines until new ones arrive.';
}
