export type Coordinate = { latitude: number; longitude: number };

export type Place = Coordinate & { label: string; detail?: string };

export type RoadRoute = {
  distanceMeters: number;
  durationSeconds: number;
  path: Coordinate[];
  geometryDetail?: 'full';
};

export const kigali = {
  latitude: -1.9499,
  longitude: 30.0835,
};

export const kigaliPlaces = {
  conventionCentre: {
    label: 'Kigali Convention Centre',
    detail: 'KG 541 Street, Kimihurura',
    latitude: -1.9547313,
    longitude: 30.0946608,
  },
  kimihurura: {
    label: 'Kimihurura, Kigali',
    latitude: -1.9528,
    longitude: 30.0898,
  },
  kacyiru: { label: 'Kacyiru, Kigali', latitude: -1.9358, longitude: 30.0846 },
  remera: { label: 'Remera, Kigali', latitude: -1.9567, longitude: 30.1194 },
  kimironko: {
    label: 'Kimironko, Kigali',
    latitude: -1.9442,
    longitude: 30.1275,
  },
  nyamirambo: {
    label: 'Nyamirambo, Kigali',
    latitude: -1.9845,
    longitude: 30.0473,
  },
  gikondo: { label: 'Gikondo, Kigali', latitude: -1.9743, longitude: 30.0774 },
} satisfies Record<string, Place>;

export function isCoordinate(value: unknown): value is Coordinate {
  if (typeof value !== 'object' || value === null) return false;
  const { latitude, longitude } = value as Partial<Coordinate>;
  return (
    typeof latitude === 'number' &&
    Math.abs(latitude) <= 90 &&
    typeof longitude === 'number' &&
    Math.abs(longitude) <= 180
  );
}

export function isRoadRoute(value: unknown): value is RoadRoute {
  if (typeof value !== 'object' || value === null) return false;
  const route = value as Partial<RoadRoute>;
  return (
    typeof route.distanceMeters === 'number' &&
    Number.isFinite(route.distanceMeters) &&
    route.distanceMeters > 0 &&
    typeof route.durationSeconds === 'number' &&
    Number.isFinite(route.durationSeconds) &&
    route.durationSeconds > 0 &&
    Array.isArray(route.path) &&
    route.path.length >= 2 &&
    route.path.length <= 25_000 &&
    (route.geometryDetail === undefined || route.geometryDetail === 'full') &&
    route.path.every(isCoordinate)
  );
}

export function coordinateKey(point: Coordinate) {
  return `${point.longitude.toFixed(6)},${point.latitude.toFixed(6)}`;
}

export function routeKey(from: Coordinate, to: Coordinate) {
  return `${coordinateKey(from)};${coordinateKey(to)}`;
}

export function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1).replace(/\.0$/, '')} km`;
}
