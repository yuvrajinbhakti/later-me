# Later Me

> your future self is watching

Set a quest, break it into milestones and tasks, and when you doom-scroll Instagram reels, get called out in your quest's own terms:

> *"Learn sharding" takes 45 minutes. You've spent 32 minutes here.*

The UI follows the Questify design (dark surfaces, one violet accent for "you are here", mint for done, orange only where your own usage earned it, and a single decorative motif: the roadmap spine).

## What works (Android)

| Piece | Status |
|---|---|
| Quests with milestones and tasks; several quests, one in focus | ✅ on-device (AsyncStorage) |
| Home, Quests, quest roadmap, milestone checklist, create-quest flow | ✅ |
| Attention dashboard on real usage: per-app time, opens, hourly, 7-day, week over week | ✅ |
| Callouts after continuous use, escalating over a session | ✅ foreground service, survives the app being swiped away |
| Sarcasm level sets delivery: gentle = notification, normal = overlay, savage = overlay + harsher + faster | ✅ |
| Daily limit: one callout per day when crossed | ✅ |
| "Not today" pause, alerts on/off, restart after reboot or app update | ✅ |
| Upgrade from the Phase 1 build keeps the goal and its step progress | ✅ |
| Draft with AI: milestones and tasks from the goal, date and hours (Claude Sonnet 5, your own API key) | ✅ key in Android Keystore, no server |
| AI-written callouts: a fresh batch of lines for the focus quest and sarcasm level each day, built-in lines as fallback | ✅ written ahead, so callouts work offline |
| iOS (Screen Time `FamilyControls` shield) | ⏳ needs Xcode; request the Family Controls entitlement early |
| Accounts, focus timer, XP and achievements | ⏳ later cycles |

## Architecture

```
src/
  app/                      Expo Router routes (thin screens)
    (tabs)/                 Home · Quests · Attention
    create/                 create-quest flow (draft context)
    quest/[id], milestone/…, app-usage/[pkg], accountability
  domain/                   pure logic, unit-tested with Jest
    quests.ts               quest model, progress, focus rules
    eta.ts, format.ts       projection and "what it cost"
    roasts.ts               roast pools by sarcasm level × tier, plus a daily-limit pool
    usage.ts                raw usage events → intervals, opens, hourly, daily, snapshot
    migration.ts            Phase 1 data → v2 state; tolerant parsing
    permissions.ts          what each sarcasm level needs
    ai.ts                   shared model, failures, API key checks, tool-call parsing
    roadmap.ts              AI draft: request and response cleanup
    aiCallouts.ts           AI callouts: request, line validation, when to refresh
    tone.ts                 phrases no callout may use, built-in or AI
  store/                    reducer, persistence, provider (syncs the watcher)
  watcher/config.ts         AppState → native config; dedupes pushes
  ai/                       Messages API client, API key in SecureStore, callout refresher
  features/                 hooks and composite components
  ui/                       design system primitives
modules/usage-stats/        local Expo module (Kotlin)
  TriggerPolicy.kt          when to call out, and how (pure, JUnit)
  WatcherSession.kt         continuous time, escalation, cooldown (pure, JUnit)
  ForegroundTracker.kt      foreground app from incremental events (pure, JUnit)
  UsageMath.kt, CalloutText.kt  today's tracked time; placeholder filling (pure, JUnit)
  WatcherService.kt         5 s loop on its own thread, overlay and notification delivery
  BootReceiver.kt           restarts the watcher after reboot or update
```

Callout lines are built in JS from the focus quest's stable facts (title, next task, estimate, deadline). `{sessionMinutes}`, `{todayMinutes}` and `{daysLeft}` are filled natively when a callout fires, so a callout never quotes a stale number while the app is closed.

## Run it (Android)

```bash
npm install
npx expo run:android
```

For fast JS reloads, keep Metro running with `env CI=false npx expo start` (the Claude Code shell sets `CI=true`, which serves stale bundles). Metro needs Node 20 or newer.

### Tests

```bash
npm test
cd android && ./gradlew :usage-stats:testDebugUnitTest
```

### Grant permissions fast (emulator)

```bash
adb shell appops set com.yuvraj.laterme android:get_usage_stats allow
adb shell appops set com.yuvraj.laterme SYSTEM_ALERT_WINDOW allow
adb shell pm grant com.yuvraj.laterme android.permission.POST_NOTIFICATIONS
adb shell dumpsys deviceidle whitelist +com.yuvraj.laterme
```

On a phone, Accountability → Permissions has a button for each.

### Try callouts on the emulator

The emulator has no Instagram. In Accountability, turn on Chrome under Tracked apps and pick the dev-only **30 s** alert-after, then open Chrome and wait. Dev builds also offer a **1m** daily limit.

If Attention shows zero usage on an emulator that definitely has some, check `adb shell dumpsys usagestats | head -12`. A `timeRange` in the future means the emulator's clock jumped at some point and Android's usage store is stuck in that period. Only a fresh AVD fixes it.

### AI features

Paste an Anthropic API key (console.anthropic.com → API keys) under Accountability → AI. The Steps screen of a new quest then offers **Draft with AI**, which sends the quest's name, why, target date and hours per week to Claude and fills in editable milestones plus a one-line read on whether the timeline is realistic. A draft costs a few cents at most.

With a key saved, **AI-written callouts** (on by default, same section) has Claude write the callout lines for the focus quest at the current sarcasm level: when either changes, and otherwise once a day while the app is open. Lines use `{goal}`, `{task}`, `{sessionMinutes}`, `{todayMinutes}` and `{daysLeft}`, so ticking tasks never makes them stale. Each line is checked for length, known placeholders and the banned-phrase list; any tier that comes back short falls back to the built-in lines. The watcher reads the saved batch, so a callout never waits on the network.

### Real-phone notes

- Allow Unrestricted battery, or the OS may stop the watcher. While alerts are on, Home asks until you allow it. Xiaomi, Oppo and Vivo also hide an Autostart switch in their security app, and it needs to be on.
- Gentle callouts are notifications, so they need notification permission. Normal and savage use the overlay and fall back to a notification without it.
# later-me
