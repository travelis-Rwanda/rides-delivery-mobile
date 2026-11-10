import {
  coordinateKey,
  isCoordinate,
  isRoadRoute,
  routeKey,
  type Coordinate,
  type Place,
  type RoadRoute,
} from './places';

const searchEndpoint =
  process.env.EXPO_PUBLIC_ADDRESS_SEARCH_URL ?? 'https://photon.komoot.io/api/';
const roadEndpoint =
  process.env.EXPO_PUBLIC_ROAD_ROUTE_URL ??
  'https://routing.openstreetmap.de/routed-car/route/v1/driving';

const searchCache = new Map<string, Place[]>();
const routeCache = new Map<string, { time: number; route: RoadRoute }>();
let nextRouteRequest = 0;

function remember<T>(cache: Map<string, T>, key: string, value: T) {
  if (cache.size >= 32) {
    const oldest = cache.keys().next();
    if (!oldest.done) cache.delete(oldest.value);
  }
  cache.set(key, value);
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function coordinateFromPair(value: unknown): Coordinate | undefined {
  if (!Array.isArray(value)) return;
  const point = { longitude: value[0], latitude: value[1] };
  if (isCoordinate(point)) return point;
}

async function getJson(url: string, signal: AbortSignal): Promise<unknown> {
  if (signal.aborted) throw new Error('Map request cancelled');
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener('abort', abort);
  const timeout = setTimeout(abort, 10000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers:
        typeof document === 'undefined'
          ? { 'User-Agent': 'RidesDelivery/1.0' }
          : undefined,
    });
    if (response.ok) return await response.json();
    if (response.status === 400) {
      const result: unknown = await response.json();
      const { code } = record(result);
      if (code === 'NoRoute' || code === 'NoSegment') return result;
    }
    throw new Error('Map service unavailable');
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener('abort', abort);
  }
}

export function parseAddressResults(value: unknown): Place[] {
  const features = record(value).features;
  if (!Array.isArray(features)) throw new Error('Invalid address results');
  const seen = new Set<string>();
  const places: Place[] = [];
  for (const feature of features) {
    const props = record(record(feature).properties);
    const point = coordinateFromPair(
      record(record(feature).geometry).coordinates,
    );
    if (!point || (props.countrycode && props.countrycode !== 'RW')) continue;

    const street = [text(props.street), text(props.housenumber)]
      .filter(Boolean)
      .join(' ');
    const label = text(props.name) || street || text(props.city);
    const detail = [
      ...new Set([
        street,
        text(props.district),
        text(props.city),
        text(props.state),
      ]),
    ]
      .filter((part) => part && part !== label)
      .join(', ');
    const key = `${label.toLowerCase()}|${detail.toLowerCase()}`;
    if (!label || seen.has(key)) continue;
    seen.add(key);
    places.push({ ...point, label, detail });
  }
  return places.slice(0, 6);
}

export async function findAddresses(
  query: string,
  center: Coordinate,
  signal: AbortSignal,
) {
  const term = query.trim();
  if (term.length < 3) return [];
  const key = `search:${coordinateKey(center)}:${term.toLowerCase()}`;
  const cached = searchCache.get(key);
  if (cached) return cached;
  const url = new URL(searchEndpoint);
  url.searchParams.set('q', term);
  url.searchParams.set('limit', '8');
  url.searchParams.set('bbox', '28.80,-2.86,30.90,-1.04');
  url.searchParams.set('lat', String(center.latitude));
  url.searchParams.set('lon', String(center.longitude));
  const results = parseAddressResults(await getJson(url.toString(), signal));
  if (!signal.aborted) remember(searchCache, key, results);
  return results;
}

function reverseAddressUrl(point: Coordinate, radius: string, limit: string) {
  const url = new URL(
    process.env.EXPO_PUBLIC_ADDRESS_REVERSE_URL ??
      searchEndpoint.replace(/\/api\/?$/, '/reverse'),
  );
  url.searchParams.set('lat', String(point.latitude));
  url.searchParams.set('lon', String(point.longitude));
  url.searchParams.set('radius', radius);
  url.searchParams.set('limit', limit);
  return url.toString();
}

export async function findNearbyPlaces(
  center: Coordinate,
  signal: AbortSignal,
) {
  const key = `nearby:${coordinateKey(center)}`;
  const cached = searchCache.get(key);
  if (cached) return cached;
  const results = parseAddressResults(
    await getJson(reverseAddressUrl(center, '1', '8'), signal),
  ).slice(0, 3);
  if (!signal.aborted) remember(searchCache, key, results);
  return results;
}

// Keep the chosen pin exact; reverse geocoding supplies its readable address only.
export async function resolveAddress(
  point: Coordinate,
  signal: AbortSignal,
): Promise<Place | undefined> {
  const [place] = parseAddressResults(
    await getJson(reverseAddressUrl(point, '0.1', '1'), signal),
  );
  return place ? { ...place, ...point } : undefined;
}

export function parseRoadRoute(value: unknown): RoadRoute | undefined {
  const response = record(value);
  if (response.code !== 'Ok' || !Array.isArray(response.routes)) return;
  const first = record(response.routes[0]);
  const coordinates = record(first.geometry).coordinates;
  if (!Array.isArray(coordinates)) return;
  const route = {
    distanceMeters: first.distance,
    durationSeconds: first.duration,
    path: coordinates.map(coordinateFromPair),
  };
  if (isRoadRoute(route)) return route;
}

export async function findRoadRoute(
  from: Coordinate,
  to: Coordinate,
  signal: AbortSignal,
) {
  const key = routeKey(from, to);
  const cached = routeCache.get(key);
  if (cached && Date.now() - cached.time < 5 * 60 * 1000) return cached.route;
  const now = Date.now();
  const wait = Math.max(0, nextRouteRequest - now);
  nextRouteRequest = now + wait + 1100;
  if (wait) await new Promise((resolve) => setTimeout(resolve, wait));

  const url = `${roadEndpoint.replace(/\/$/, '')}/${key}?overview=full&geometries=geojson&steps=false&radiuses=500;500`;
  const result = parseRoadRoute(await getJson(url, signal));
  if (!result || signal.aborted) return;
  const route: RoadRoute = { ...result, geometryDetail: 'full' };
  remember(routeCache, key, { time: Date.now(), route });
  return route;
}
