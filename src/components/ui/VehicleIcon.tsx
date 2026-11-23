import type { ColorValue } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

export type VehicleIconKind = 'moto' | 'cab' | 'hilux';

// Outline icons in the same style as the rest of the app: one colour, rounded
// strokes. They are drawn on a 48-point grid, so they stay crisp at the larger
// size used on the request form.
export function VehicleIcon({
  kind,
  size = 44,
  color = 'currentColor',
}: {
  kind: VehicleIconKind;
  size?: number;
  color?: ColorValue;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={true}
    >
      {kind === 'moto' && (
        <>
          <Circle cx={10} cy={33} r={6.2} />
          <Circle cx={38} cy={33} r={6.2} />
          <Path d="M6.5 22.5 H19.5 L25 17 H33.1" />
          <Path d="M32 13.5 L38 33" />
          <Path d="M28.5 13.5 H35.5" />
          <Path d="M19 33 V27 H29 V33 H19" />
          <Path d="M19 29.5 L12.5 31" />
          <Path d="M10 33 L14.5 24" />
        </>
      )}
      {kind === 'cab' && (
        <>
          <Circle cx={14} cy={33} r={4.4} />
          <Circle cx={34} cy={33} r={4.4} />
          <Path d="M9.6 33 H7 a2 2 0 0 1-2-2 v-5.2 c0-1.7 1.2-3 2.8-3.4 L14.4 21 l3.2-5.4 A3.2 3.2 0 0 1 20.4 14 H28 a3.2 3.2 0 0 1 2.8 1.6 L34 21 l6 1.4 c1.7.4 2.9 1.7 2.9 3.4 V31 a2 2 0 0 1-2 2 H38.4 M29.6 33 H18.4" />
          <Path d="M17.6 21 l2.4-4 H28 l2.4 4 Z M24 17 v4" />
          <Path d="M21 14 v-2.6 a1 1 0 0 1 1-1 h4 a1 1 0 0 1 1 1 V14" />
        </>
      )}
      {kind === 'hilux' && (
        <>
          <Circle cx={12.5} cy={33.5} r={4.5} />
          <Circle cx={36} cy={33.5} r={4.5} />
          <Path d="M8 33.5 H6 a2 2 0 0 1-2-2 V21 H21.5 V15 H32 L38 22.5 H41.5 a2.5 2.5 0 0 1 2.5 2.5 v6.5 a2 2 0 0 1-2 2 h-1.5 M31.5 33.5 H17" />
          <Path d="M25 22.5 V17.5 H31 L35 22.5 Z" />
          <Path d="M4 26 H21.5" />
          <Path d="M41.5 27 h2.5" />
        </>
      )}
    </Svg>
  );
}