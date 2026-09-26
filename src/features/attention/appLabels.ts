export const KNOWN_APPS: Record<string, string> = {
  'com.instagram.android': 'Instagram',
  'com.google.android.youtube': 'YouTube',
  'com.zhiliaoapp.musically': 'TikTok',
  'com.twitter.android': 'X',
  'com.reddit.frontpage': 'Reddit',
  'com.snapchat.android': 'Snapchat',
  'com.android.chrome': 'Chrome',
};

export function appLabel(pkg: string): string {
  if (KNOWN_APPS[pkg]) return KNOWN_APPS[pkg];
  const tail = pkg.split('.').pop() ?? pkg;
  return tail.charAt(0).toUpperCase() + tail.slice(1);
}
