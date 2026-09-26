import { Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { type as typeScale, type TypeVariant } from './theme';

export interface AppTextProps extends TextProps {
  variant?: TypeVariant;
  color?: string;
  /** Tabular figures, so digits don't jitter as numbers change. */
  num?: boolean;
}

export function Text({ variant = 'body', color, num, style, ...rest }: AppTextProps) {
  const extra: TextStyle = {};
  if (color) extra.color = color;
  if (num) extra.fontVariant = ['tabular-nums'];
  return <RNText {...rest} style={[typeScale[variant], extra, style]} />;
}
