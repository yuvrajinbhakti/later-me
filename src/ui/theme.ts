import type { TextStyle } from 'react-native';

/**
 * Questify's dark tokens. The accent is rationed: violet marks only the current position and the
 * next action, mint means done, orange appears only where the user's own usage earned it.
 */
export const colors = {
  bg: '#0B0D12',
  surface: '#131720',
  elevated: '#1A1F2B',
  border: '#292F3D',
  text: '#F5F7FA',
  text2: '#9AA3B2',
  muted: '#656D7B',
  accent: '#8B7CFF',
  accentDim: '#6E5FE0',
  onAccent: '#0B0D12',
  mint: '#5EE7B7',
  warning: '#FFCC66',
  danger: '#FF6B81',
  sarcasm: '#FF7A59',
  accentWash: 'rgba(139,124,255,0.14)',
  mintWash: 'rgba(94,231,183,0.13)',
  sarcasmWash: 'rgba(255,122,89,0.13)',
  dangerWash: 'rgba(255,107,129,0.13)',
  warnWash: 'rgba(255,204,102,0.13)',
  rail: '#292F3D',
  scrim: 'rgba(6,8,12,0.72)',
} as const;

export const radius = { s: 8, m: 12, l: 16, xl: 20, pill: 999 } as const;
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 32, 8: 40, 9: 48, 10: 64 } as const;
export const pad = 20;
export const navHeight = 62;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
} as const;

/** Android ignores fontWeight on custom fonts, so every weight is its own family. */
export const type = {
  display: { fontFamily: fonts.extrabold, fontSize: 34, lineHeight: 37, letterSpacing: -1, color: colors.text },
  hLg: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 32, letterSpacing: -0.7, color: colors.text },
  hSec: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 24, letterSpacing: -0.3, color: colors.text },
  title: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22, letterSpacing: -0.2, color: colors.text },
  label: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 20, color: colors.text },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 23, color: colors.text2 },
  cap: { fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 17, color: colors.text2 },
  meta: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, color: colors.muted },
  eyebrow: {
    fontFamily: fonts.bold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  link: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.accent },
} satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;
