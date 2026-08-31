export interface Goal {
  /** The aim, phrased as an outcome: "Backend engineer role by December". */
  aim: string;
  /** ISO date string for the deadline. */
  targetDate: string;
  /** Hours per week the user claims they'll invest. */
  hoursPerWeek: number;
  /** The step currently being worked on ("DDIA chapter 7"). */
  currentStep: string;
  /** Roadmap size — Phase 1 keeps these as manual numbers. */
  stepsTotal: number;
  stepsDone: number;
  /** ISO date the goal was created (anchors pace math). */
  createdAt: string;
}

export interface WatcherSettings {
  watchedPackages: string[];
  thresholdSeconds: number;
  cooldownSeconds: number;
}

export const DEFAULT_WATCHER_SETTINGS: WatcherSettings = {
  watchedPackages: ['com.instagram.android'],
  thresholdSeconds: 600,
  cooldownSeconds: 120,
};

/** Friendly names for common time sinks, for the watch-list UI. */
export const KNOWN_APPS: Record<string, string> = {
  'com.instagram.android': 'Instagram',
  'com.google.android.youtube': 'YouTube',
  'com.zhiliaoapp.musically': 'TikTok',
  'com.twitter.android': 'X / Twitter',
  'com.reddit.frontpage': 'Reddit',
  'com.snapchat.android': 'Snapchat',
  'com.android.chrome': 'Chrome',
};
