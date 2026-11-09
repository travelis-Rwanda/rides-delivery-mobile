import type { ColorValue } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName =
  | 'arrow'
  | 'back'
  | 'chevron'
  | 'home'
  | 'activity'
  | 'help'
  | 'pin'
  | 'parcel'
  | 'food'
  | 'shop'
  | 'cargo'
  | 'check'
  | 'shield'
  | 'clock'
  | 'plus'
  | 'minus'
  | 'close'
  | 'edit'
  | 'search';
// The existing outline icon system is shared by browsing and delivery screens.

const paths: Record<IconName, string> = {
  search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  back: 'M19 12H5m5-5-5 5 5 5',
  chevron: 'm9 5 7 7-7 7',
  home: 'm3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
  activity:
    'M8 5h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3m1 6h7m-7 5h7M9 3h6v4H9Z',
  help: 'M9.1 8a3 3 0 0 1 5.8 1c0 2-3 2-3 4m0 4h.01',
  pin: 'M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z',
  parcel: 'm3 7 9-4 9 4v10l-9 4-9-4Zm0 0 9 4 9-4m-9 4v10M7.5 5l9 4v4',
  food: 'M5 3v6c0 2 5 2 5 0V3M7.5 3v18M19 3c-4 1-5 5-5 9h5m0-9v18',
  shop: 'M4 8h16l1 13H3Zm4 0V6a4 4 0 0 1 8 0v2',
  cargo:
    'M3 5h12v12H3Zm12 5h4l3 4v3h-7M6 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm12 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  check: 'm5 12 4 4L19 6',
  shield: 'm12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Zm-4 9 3 3 5-6',
  clock: 'M12 6v6l4 2',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  close: 'm6 6 12 12M6 18 18 6',
  edit: 'm14 5 5 5M4 20l5-1L21 7l-5-5L4 14Zm0 0 1-6',
};

export function Icon({
  name,
  size = 22,
  color = 'currentColor',
}: {
  name: IconName;
  size?: number;
  color?: ColorValue;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={true}
    >
      {(name === 'help' || name === 'clock') && (
        <Circle cx={12} cy={12} r={9} />
      )}
      {name === 'pin' && <Circle cx={12} cy={10} r={2.5} />}
      {name === 'activity' && (
        <Rect x={8} y={2.5} width={8} height={4.5} rx={1.5} fill="none" />
      )}
      <Path d={paths[name]} />
    </Svg>
  );
}
