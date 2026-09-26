# Questify design port — core loop

Status: approved in brainstorm, 2026-09-26
Design source: Questify HTML prototype (49 mocked screens), `files.zip`

## Problem

Later Me's interruption mechanic works — the native watcher detects continuous Reels use and
throws a full-screen roast — but the app around it is two utilitarian tabs with a single goal and
hand-typed step counts. Questify is a finished visual and interaction design for the same product,
entirely mocked. The user (the primary and only user for now: someone losing hours to Instagram
Reels while working toward a goal) wants Questify's experience running on Later Me's real data.

## Goals

- Later Me looks and behaves like Questify's core loop, on-device, with every number real.
- Quests become structured: milestones containing tasks, progress derived from ticked tasks.
- The attention screens show real usage (time per app, opens, hourly, 7-day, week-over-week).
- Accountability settings drive the existing native watcher, including a sarcasm level that sets
  both wording and intrusiveness.
- Nothing the user already has on their phone is lost on upgrade.

## Non-goals (this cycle)

Needs infrastructure: accounts / sign-in / sync, AI roadmap generation.
Next cycle: focus timer, stats and weekly review, XP / levels / streaks / achievements, reward
interstitials, notification history, profile / settings / appearance, light theme, onboarding
carousel and splash animation, task detail.

## Approach

Native rebuild in React Native (chosen over an "attention-first" Home, which breaks Questify's
decision-ordered Home, and a WebView wrapper, which saves time now at the cost of a web feel and a
rewrite of every mocked value anyway). The app keeps the Later Me name and package id; Questify is
the design source only.

## Design system

Port Questify's tokens as-is (dark palette only): surfaces, text tiers, violet accent, mint for
done, orange "sarcasm" colour, radii, spacing scale, tabular numerals. Keep its rules: violet marks
only your current position and next action; orange appears only where the user's own usage earned
it; never more than two accents on one screen. The one decorative motif is the spine — a 2px rail
with nodes — used on the quest roadmap and Home card. Icons follow Questify's stroke set.

## Screens

Three tabs: **Home · Quests · Attention**.

| Screen | Behaviour |
|---|---|
| Home | Greeting; focus-quest card (progress, next milestone, Continue); today's tasks (the next three unticked tasks of the focus quest's current milestone); attention card (today's tracked time, over-limit chip); permissions-missing banner when applicable. |
| Quests | Segments Active / Paused / Completed. Set as focus, pause, resume, complete, delete. FAB creates a quest. When the focus quest is paused, completed or deleted, the most recently created remaining active quest becomes focus; with none, there is no focus quest. |
| Quest detail | Title, % complete, deadline, "why"; vertical roadmap of milestones — done (mint rail), current ("you are here"), upcoming. |
| Milestone detail | Tasks with checkboxes; progress recalculates live; ticking the last task marks the milestone done and advances "current" to the next. |
| Create goal | One large field plus a few preset goals. Empty input blocks Next. |
| Goal details | Why it matters, target date, hours per week. |
| Define steps | Manual editor: add / rename / reorder / remove milestones and tasks; optional minutes estimate per task. At least one milestone with one task to finish. |
| Quest created | Confirms and shows the first task. First quest created becomes the focus quest. |
| Attention | Today's total across tracked apps vs daily limit; per-app bars; one observation line; this week vs last. |
| App detail | Today's time and open count; hourly bars; last 7 days; "what it cost" in focus-quest terms. |
| Accountability | Alerts on/off; sarcasm level; alert after; daily limit; tracked apps; permission status with fix buttons; live preview of a callout at the chosen level; "Not today" pause. |
| No quests | Empty state for Home and Quests with a create action. |
| Permissions missing | State on Attention and banner on Home naming which permission and linking to it. |

## Callouts (watcher behaviour)

- **Sarcasm level sets intrusiveness.** Gentle: a notification, no overlay. Normal: the full-screen
  overlay (today's behaviour). Savage: overlay with harsher copy and faster escalation.
- **Continuous trigger:** "Alert after" 5 / 10 / 15 / 30 min of continuous use of a tracked app.
  Within one session, repeat triggers escalate through three tiers, as today, at every level
  (gentle escalates its notification wording). The wait between escalating triggers is fixed, not
  a user setting: 2 min for gentle and normal, 1 min for savage.
- **Daily limit trigger:** 1h / 2h / 3h / none. Crossing it fires one callout that day regardless
  of continuous time, delivered the way the current sarcasm level delivers callouts.
- **Alerts off** stops all callouts; tracking and the Attention screens keep working.
- The overlay adopts the new tokens; its copy always names the focus quest and its current task.
- "Not today" pause and the service's survival after the app is swiped away are unchanged.

## Roasts and tone

Roast pools are indexed by sarcasm level × escalation tier, template-filled from the focus quest
(title, current task, task estimate, deadline, projected finish) and today's usage (minutes,
opens). One rule from Questify governs every line: describe what the user did, never who they are
— no insults, no "wasted potential". Existing lines that break it are rewritten. With no quest,
lines fall back to usage-only copy.

## Progress and ETA

Quest progress = ticked tasks / total tasks. Projected finish extrapolates the ticking pace since
creation, as `eta.ts` does today with manual counts. "What it cost" converts today's tracked
minutes into the focus quest's current task estimate ("1.8 × Learn sharding") and into days of the
stated hours-per-week budget.

## Data and migration

All state lives on the device. Entities: quests (status active / paused / completed, one flagged
focus), milestones, tasks (done flag, optional minutes), accountability settings. On first launch
after upgrade, an existing single goal becomes a quest: aim → title, target date and hours/week
carried over, current step → first task of one milestone, and it becomes the focus quest. Existing
tracked-app list and threshold carry over (threshold rounded to the nearest "alert after" option).

## Error handling

- Usage access or overlay permission revoked: Attention shows the permissions-missing state; the
  watcher skips the affected capability without crashing (overlay missing → falls back to a
  notification).
- Notification permission denied: gentle-level callouts cannot be delivered; Accountability says
  so next to the level picker.
- Corrupt or unreadable stored data: start clean rather than crash, and keep the raw value so it
  is not overwritten silently.

## Testing

- Unit: progress and ETA maths, roast selection per level × tier, template filling, migration of
  the old goal, daily-limit and continuous trigger decisions, usage aggregation (per app, hourly,
  7-day, opens) from a recorded event sequence.
- On the emulator: create quest end to end; tick tasks through a milestone; each sarcasm level
  produces its callout type; daily limit fires once; permissions-missing states; upgrade from the
  Phase 1 build keeps the existing goal.

## Assumptions

- Single user, single device; no sync expectations this cycle.
- Tracked-app choice stays a list of known apps plus custom package names; an installed-app picker
  is not required.
- Hour-of-day and 7-day usage are derivable from the platform's usage events retention on the
  target phone; if history is shorter, screens show what exists without inventing data.
