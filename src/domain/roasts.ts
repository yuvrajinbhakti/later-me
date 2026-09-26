import { daysBetween, formatDate, formatMinutes, parseLocalDate } from './format';
import { nextTask } from './quests';
import type { AppUsage, Quest, SarcasmLevel } from './types';

/**
 * tiers[0..2] escalate within one session; limit fires once when the daily limit is crossed.
 * Placeholders {sessionMinutes}, {todayMinutes} and {daysLeft} are filled by the native watcher
 * when a callout fires, so nothing here can go stale while the app is closed.
 */
export interface RoastPools {
  tiers: string[][];
  limit: string[];
}

/** Callouts describe behaviour, never character. */
export const BANNED_PHRASES = [
  'lazy',
  'pathetic',
  'loser',
  'decoration',
  'wasted potential',
  'useless',
  'failure',
  'shame',
];

interface QuestContext {
  title: string;
  task: string;
  est: string | null;
  deadline: string;
}

type Line = (c: QuestContext) => string;

const QUEST_POOLS: Record<SarcasmLevel, { tiers: Line[][]; limit: Line[] }> = {
  gentle: {
    tiers: [
      [
        (c) => `You've been here {sessionMinutes} minutes. "${c.task}" is waiting whenever you are.`,
        (c) => `{sessionMinutes} minutes in. Your next step is small: "${c.task}".`,
        (c) =>
          c.est
            ? `"${c.task}" takes about ${c.est}. That's less than this scroll has.`
            : `One small step on "${c.title}" would feel better than this. Promise.`,
        (c) => `Quick check-in: {todayMinutes} minutes on this today. "${c.title}" is still there.`,
      ],
      [
        (c) => `Still scrolling. No judgement, just a nudge toward "${c.task}".`,
        (c) => `{todayMinutes} minutes today so far. {daysLeft} days until ${c.deadline}.`,
        (c) => `Back again. The reels will keep. "${c.task}" is a nicer place to be.`,
      ],
      [
        (c) => `Third nudge. Maybe put the phone down and open "${c.task}"?`,
        (c) => `{sessionMinutes} minutes this stretch. "${c.title}" could use ten of them.`,
      ],
    ],
    limit: [
      (c) => `You've reached today's limit: {todayMinutes} minutes. A good moment to switch to "${c.task}".`,
      (c) => `That's your daily limit. "${c.title}" would love the next hour.`,
    ],
  },
  normal: {
    tiers: [
      [
        (c) => `{sessionMinutes} minutes of reels. "${c.task}" remains, heroically, untouched.`,
        (c) => `That's {todayMinutes} minutes today. "${c.title}" says hi.`,
        (c) => `Quick math: {todayMinutes} minutes of scrolling, 0 on "${c.task}". Interesting ratio.`,
        (c) => `The reels will still be here after "${c.task}". They are infinite. Your {daysLeft} days are not.`,
        (c) =>
          c.est
            ? `"${c.task}" takes ${c.est}. You've spent {sessionMinutes} minutes here.`
            : `Your quest isn't going to complete itself. But apparently the feed might.`,
      ],
      [
        (c) => `Back again. {todayMinutes} minutes today, and "${c.title}" is due ${c.deadline}.`,
        (c) => `Second round of reels, zero rounds of "${c.task}". The scoreboard isn't flattering.`,
        () => `Just one more reel? That's what you said {sessionMinutes} minutes ago.`,
        () => `{daysLeft} days left. You're spending them like they respawn.`,
      ],
      [
        () => `Third callout. At this point you're not checking the feed. The feed is checking you.`,
        (c) => `You said "${c.title}" by ${c.deadline}. Today it got {todayMinutes} minutes of reels instead.`,
        (c) => `"${c.task}". Right now. The feed will survive without you.`,
      ],
    ],
    limit: [
      (c) => `Daily limit reached: {todayMinutes} minutes. "${c.title}" would like a word.`,
      (c) => `You set the limit, and today crossed it. "${c.task}" is still waiting.`,
    ],
  },
  savage: {
    tiers: [
      [
        (c) => `{sessionMinutes} minutes deep and zero percent closer to "${c.title}". Bold strategy.`,
        (c) => `Plot twist: you're procrastinating again. "${c.task}" noticed.`,
        (c) => `{todayMinutes} minutes today. "${c.task}" has been waiting longer than any reel lasts.`,
        (c) =>
          c.est
            ? `"${c.task}" is ${c.est}. You've spent {sessionMinutes} minutes on strangers' lives.`
            : `{sessionMinutes} minutes on strangers' lives. "${c.title}" is still yours to do.`,
      ],
      [
        (c) => `Again? {daysLeft} days to ${c.deadline}, and this is the plan?`,
        (c) => `Second strike. "${c.title}" watched you pick the feed. Again.`,
        () => `You dismissed me and came straight back. The algorithm thanks you for your service.`,
      ],
      [
        (c) => `Third time. Close the app and open "${c.task}", or keep feeding the algorithm. {daysLeft} days left.`,
        (c) => `Intervention: {todayMinutes} minutes today. "${c.task}" would have taken less.`,
        (c) => `Today's score: {todayMinutes} minutes of reels, 0 minutes of "${c.title}". Wild.`,
      ],
    ],
    limit: [
      () => `{todayMinutes} minutes today. You set the limit yourself, and you sailed straight past it.`,
      (c) => `Limit blown. "${c.title}" got nothing today and the feed got {todayMinutes} minutes.`,
    ],
  },
};

const NO_QUEST_POOLS: Record<SarcasmLevel, RoastPools> = {
  gentle: {
    tiers: [
      ["You've been scrolling {sessionMinutes} minutes. Maybe set a quest so this time goes somewhere?"],
      ['Still here. {todayMinutes} minutes today.'],
      ['Third nudge. Put it down for a bit?'],
    ],
    limit: ["You've reached today's limit: {todayMinutes} minutes. Time for something else?"],
  },
  normal: {
    tiers: [
      [
        '{sessionMinutes} minutes of reels and no quest set. Ambitious in a new way.',
        '{todayMinutes} minutes today. Toward what, exactly?',
      ],
      ['Still scrolling, still questless. Bold strategy.'],
      ["Third time. You're putting off deciding what to stop putting off."],
    ],
    limit: ['Daily limit reached: {todayMinutes} minutes of reels today.'],
  },
  savage: {
    tiers: [
      ['{sessionMinutes} minutes deep with no quest. The feed has a plan for your evening. Do you?'],
      ['Back again. {todayMinutes} minutes today and nothing to show for it.'],
      ['Third strike. Set a quest, or keep training the algorithm for free.'],
    ],
    limit: ['{todayMinutes} minutes today, past the limit you set. The algorithm is thrilled.'],
  },
};

function contextFor(quest: Quest): QuestContext {
  const task = nextTask(quest);
  return {
    title: quest.title,
    task: task?.title ?? 'your next step',
    est: task?.minutes ? `${task.minutes} minutes` : null,
    deadline: formatDate(parseLocalDate(quest.targetDate)),
  };
}

export function buildRoastPools(level: SarcasmLevel, quest: Quest | null): RoastPools {
  if (!quest) return NO_QUEST_POOLS[level];
  const c = contextFor(quest);
  const pools = QUEST_POOLS[level];
  return { tiers: pools.tiers.map((tier) => tier.map((line) => line(c))), limit: pools.limit.map((line) => line(c)) };
}

export function previewLine(level: SarcasmLevel, quest: Quest | null, now: Date): string {
  const daysLeft = quest ? Math.max(daysBetween(now, parseLocalDate(quest.targetDate)), 0) : 0;
  return buildRoastPools(level, quest)
    .tiers[0][0].replace('{sessionMinutes}', '17')
    .replace('{todayMinutes}', '42')
    .replace('{daysLeft}', String(daysLeft));
}

export function observationLine(apps: AppUsage[]): string | null {
  const byOpens = [...apps].sort((a, b) => b.opens - a.opens)[0];
  if (byOpens && byOpens.opens >= 5) {
    const app = byOpens.label;
    return `You've opened ${app} ${byOpens.opens} times today. At this point you're not checking ${app}. ${app} is checking you.`;
  }
  const byTime = [...apps].sort((a, b) => b.minutes - a.minutes)[0];
  if (byTime && byTime.minutes >= 1) {
    return `${byTime.label} has had ${formatMinutes(byTime.minutes)} of your day so far.`;
  }
  return null;
}
