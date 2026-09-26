import { formatDate, projectEta } from './eta';

type RoastTiers = string[][];
import { Goal } from './types';

/**
 * Phase 1 roast engine: offline template lines in 3 escalation tiers,
 * pre-filled with everything JS knows (goal, usage, ETA math). The single
 * placeholder {sessionMinutes} is left for the native overlay to fill at
 * display time, since only the service knows the live session length.
 *
 * Phase 2 replaces this file's output with LLM-generated batches.
 */
export function buildRoastTiers(goal: Goal | null, minutesToday: number): RoastTiers {
  const min = Math.round(minutesToday);

  if (!goal) {
    return [
      [
        `{sessionMinutes} min of reels and no goal set. Ambitious in a new way.`,
        `You haven't even told me what you're working toward. The algorithm knows you better than you do.`,
        `${min} minutes today. Toward what, exactly?`,
      ],
      [
        `Still scrolling, still goalless. Bold strategy.`,
        `{sessionMinutes} more min. Set a goal so I can at least be specific about this.`,
      ],
      [
        `This is the third time. You're procrastinating on deciding what to stop procrastinating on.`,
      ],
    ];
  }

  const eta = projectEta(goal);
  const aim = goal.aim;
  const step = goal.currentStep || 'your next step';
  const daysLost = eta.daysLostTo(minutesToday);
  const daysLostStr = daysLost >= 0.1 ? daysLost.toFixed(1) : null;
  const projected = formatDate(eta.projectedDate);

  const tier1 = [
    `{sessionMinutes} min of reels. "${step}" remains, heroically, untouched.`,
    `That's ${min} minutes today. "${aim}" says hi.`,
    `Quick math: ${min} minutes of scrolling, 0 minutes on "${step}". Interesting ratio.`,
    `The reels will still be here after "${step}". They are infinite. Your ${eta.daysToTarget} days are not.`,
    daysLostStr
      ? `Today's scrolling cost ${daysLostStr} days of "${aim}". The algorithm thanks you for your sacrifice.`
      : `Every minute here is a minute "${aim}" doesn't get. Just saying.`,
    `Projected finish at current pace: ${projected}. Your deadline: ${formatDate(new Date(goal.targetDate))}. No further comment.`,
    `{sessionMinutes} min of other people's lives watched. "${aim}" is supposed to be yours.`,
    `"${step}" takes less time than you've spent here today. That's the tweet.`,
  ];

  const tier2 = [
    `Back again. ${min} minutes today. At this rate "${aim}" ships ${projected}.`,
    `Second round of reels, zero rounds of "${step}". The scoreboard isn't flattering.`,
    `You dismissed me and came straight back. "${aim}" noticed.`,
    `${eta.daysToTarget} days left. You're spending them like they respawn.`,
    `Fun fact: nobody ever scrolled their way to "${aim}". You could be the first! (You won't.)`,
    daysLostStr
      ? `Running total: ${daysLostStr} days of progress traded for reels today. Market's rough.`
      : `The opportunity cost of this session is now measurable. That's not a compliment.`,
    `"${step}" has been 'in progress' longer than some relationships. This is why.`,
  ];

  const tier3 = [
    `Third strike. ${min} minutes today. Future you is watching this in the highlight reel of why it didn't happen.`,
    `Let's be honest: at this point it's not a break, it's a decision. "${aim}" or this. Pick.`,
    `You said "${aim}" by ${formatDate(new Date(goal.targetDate))}. Current trajectory: ${projected}. You do the emotional math.`,
    `I've interrupted you 3 times this session. Instagram's engineers are winning and they don't even know your name.`,
    `"${step}". Thirty minutes. Right now. Or admit the goal was decoration.`,
  ];

  return [tier1, tier2, tier3.filter(Boolean)];
}
