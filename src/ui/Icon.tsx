import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from './theme';

type Shape = ['path', string] | ['circle', number, number, number] | ['rect', number, number, number, number, number];

/** Questify's stroke set on a 24px grid. */
const ICONS = {
  home: [['path', 'M3 10.5 12 3l9 7.5'], ['path', 'M5 9.5V21h14V9.5']],
  quests: [['path', 'M12 3 21 12l-9 9-9-9 9-9Z'], ['path', 'M12 8.5 15.5 12 12 15.5 8.5 12 12 8.5Z']],
  eye: [['path', 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z'], ['circle', 12, 12, 3]],
  back: [['path', 'M15 5 8 12l7 7']],
  next: [['path', 'M9 5l7 7-7 7']],
  check: [['path', 'M4.5 12.5 9.5 17.5 19.5 7']],
  plus: [['path', 'M12 5v14M5 12h14']],
  settings: [
    ['circle', 12, 12, 3],
    [
      'path',
      'M19.4 14a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.8-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 4 14a2 2 0 1 1 0-4 1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10.6 4a2 2 0 1 1 4 0 1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.6 1.6 0 0 0 20 10a2 2 0 1 1 0 4Z',
    ],
  ],
  x: [['path', 'M6 6l12 12M18 6 6 18']],
  alert: [['path', 'M12 4.5 21 19.5H3L12 4.5Z'], ['path', 'M12 10v4M12 16.6v.4']],
  calendar: [['rect', 3.5, 5.5, 17, 15, 2.5], ['path', 'M3.5 10h17M8 3.5v4M16 3.5v4']],
  up: [['path', 'M12 19V5M6 11l6-6 6 6']],
  down: [['path', 'M12 5v14M6 13l6 6 6-6']],
  trash: [['path', 'M4 7h16M9.5 7V5h5v2M6.5 7l1 13h9l1-13']],
  shield: [['path', 'M12 3.5 19.5 6v5.5c0 4.4-3 7.6-7.5 9-4.5-1.4-7.5-4.6-7.5-9V6L12 3.5Z']],
  flag: [['path', 'M5.5 21V4.5M5.5 5h11l-2 3.5 2 3.5h-11']],
  map: [['path', 'M3 7.5 9 5l6 2.5L21 5v11.5L15 19l-6-2.5L3 19V7.5Z'], ['path', 'M9 5v11.5M15 7.5V19']],
  more: [['circle', 5, 12, 1.2], ['circle', 12, 12, 1.2], ['circle', 19, 12, 1.2]],
  pause: [['path', 'M9 5v14M15 5v14']],
  play: [['path', 'M7 4.5 19 12 7 19.5v-15Z']],
  spark: [['path', 'M12 4l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Z']],
} satisfies Record<string, Shape[]>;

export type IconName = keyof typeof ICONS;

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 20, color = colors.text2, strokeWidth = 1.8 }: IconProps) {
  const stroke = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
      {(ICONS[name] as Shape[]).map((shape, i) => {
        if (shape[0] === 'path') return <Path key={i} d={shape[1]} {...stroke} />;
        if (shape[0] === 'circle') return <Circle key={i} cx={shape[1]} cy={shape[2]} r={shape[3]} {...stroke} />;
        return <Rect key={i} x={shape[1]} y={shape[2]} width={shape[3]} height={shape[4]} rx={shape[5]} {...stroke} />;
      })}
    </Svg>
  );
}
