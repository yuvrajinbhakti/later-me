# Later Me

> your future self is watching

Set an aim, track the roadmap toward it — and when you doom-scroll Instagram reels, get interrupted by a full-screen sarcastic overlay that prices the wasted time **in your goal's currency**:

> *"47 minutes of reels. 'DDIA chapter 7' remains, heroically, untouched. New ETA for 'backend engineer by December': February."*

## Status: Phase 1 — Android detection spike

The make-or-break mechanic (detect doom-scrolling → interrupt with a contextual roast) works end-to-end on Android, fully offline. Everything else is deliberately minimal.

| Piece | Status |
|---|---|
| Foreground-app detection (`UsageStatsManager`) | ✅ native module |
| Full-screen roast overlay with escalation tiers + cooldown | ✅ foreground service, survives app being swiped away |
| Goal intake + crude ETA/slip math feeding the roasts | ✅ local only (AsyncStorage) |
| "Not today" pause (one tap, zero guilt) | ✅ |
| iOS (Screen Time `FamilyControls` shield) | ⏳ Phase 2 — **needs Xcode installed**; also request the Family Controls distribution entitlement from Apple early, approval takes weeks |
| LLM-generated roadmap + roasts | ⏳ Phase 2 |
| Blur-reveal end-state image, momentum score, weekly review | ⏳ Phase 3 |

## Architecture

```
App.tsx                     – tab shell (Goal / Watcher)
src/
  screens/GoalScreen.tsx    – aim, deadline, hours/week, manual roadmap numbers
  screens/WatcherScreen.tsx – permissions, watch list, threshold, start/stop, pause
  roasts.ts                 – 3-tier offline roast templates, filled from goal + ETA math
  eta.ts                    – pace → projected finish date + slip days
modules/usage-stats/        – local Expo module (Kotlin, Android only)
  UsageStatsModule.kt       – permissions, usage queries, service control
  WatcherService.kt         – 5s polling loop, overlay UI, escalation, cooldown
  Prefs.kt                  – SharedPreferences bridge so the service runs without JS
```

Roast lines are template-filled in JS and handed to the native service as JSON at watcher start, so roasts keep working after the RN app process dies. `{sessionMinutes}` is the one placeholder filled natively at display time.

## Run it (Android)

```bash
npm install
npx expo run:android        # builds + installs on the running emulator/device
```

First build generates the `android/` folder (gitignored — regenerate any time with `npx expo prebuild -p android`).

**If Gradle complains about the Java version**: this machine has JDK 23; install 17 and point Gradle at it:

```bash
brew install --cask temurin@17
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
```

### Grant permissions fast (emulator/adb)

```bash
adb shell appops set com.yuvraj.laterme android:get_usage_stats allow
adb shell appops set com.yuvraj.laterme SYSTEM_ALERT_WINDOW allow
adb shell pm grant com.yuvraj.laterme android.permission.POST_NOTIFICATIONS
```

(On a real phone use the buttons in the Watcher tab → Settings.)

### Try the spike on the emulator

The emulator has no Instagram, so add `com.android.chrome` to the watch list, set the threshold to ~30 s, start the watcher, open Chrome, and wait. The overlay should appear over Chrome; "Fine, I'm out →" sends you home, the small dismiss link starts the cooldown, and re-triggering escalates the tone tier by tier.

### Real-phone notes

- Disable battery optimization for Later Me (Settings → Battery) or the OS may kill the polling service.
- Notification permission is optional — without it the persistent notification is hidden but the watcher still runs.

## Phase 2 sketch

- **iOS**: `FamilyControls` + `DeviceActivityMonitor` extension fires at a usage threshold; `ShieldConfiguration` extension renders a roast as the blocking screen. Roasts must be pre-generated into an App Group container (shield extensions get no network and almost no runtime).
- **LLM**: goal → 3 clarifying questions → roadmap of *verifiable* steps (each step has a binary artifact); nightly batch of ~15 fresh roasts per tier with real context (goal, pace, slip, current step).
- Keep the backend tiny — the product is roast quality + roadmap verifiability, not infrastructure.
