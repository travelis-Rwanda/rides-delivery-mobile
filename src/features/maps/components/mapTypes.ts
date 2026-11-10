import type { Coordinate } from '../places';

export type MapMarker = {
  point: Coordinate;
  title: string;
  color: string;
};

export type MapCanvasProps = {
  markers: readonly MapMarker[];
  areaCenter?: Coordinate;
  path?: readonly Coordinate[];
  onPick?: (point: Coordinate) => void;
  height: number;
  label: string;
};

export const pickupColor = '#1768E5';
export const deliveryColor = '#168560';
