import type { Coordinate, RoadRoute } from '../maps/places';
import {
  pricingConfig,
  type FareService,
  type PricingConfig,
  type Size,
} from './config';

export type DistanceSource = 'road' | 'estimated' | 'unknown';

export type MinimumFareInput = {
  service: FareService;
  size: Size;
  roadRoute?: RoadRoute;
  pickupPoint?: Coordinate;
  destinationPoint?: Coordinate;
};

export type MinimumFare = {
  amount: number;
  distanceKm: number | null;
  distanceSource: DistanceSource;
};

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

// Haversine formula: straight-line distance between two GPS points.
export function straightLineKm(a: Coordinate, b: Coordinate) {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) *
      Math.cos(toRad(b.latitude)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function roundUp(amount: number, step: number) {
  return Math.ceil(Number((amount / step).toFixed(6))) * step;
}

export function minimumFare(
  input: MinimumFareInput,
  config: PricingConfig = pricingConfig,
): MinimumFare {
  const rule = config.fare[input.service];
  let distanceKm: number | null = null;
  let distanceSource: DistanceSource = 'unknown';
  let minutes = 0;

  if (input.roadRoute) {
    // Best case: real road distance and time from the maps feature.
    distanceKm = input.roadRoute.distanceMeters / 1000;
    minutes = input.roadRoute.durationSeconds / 60;
    distanceSource = 'road';
  } else if (input.pickupPoint && input.destinationPoint) {
    // Fallback: two pins but no route yet.
    distanceKm =
      straightLineKm(input.pickupPoint, input.destinationPoint) *
      config.detourFactor;
    distanceSource = 'estimated';
  }

  const calculated =
    distanceKm === null
      ? 0
      : rule.baseFare +
        distanceKm * rule.perKm +
        minutes * rule.perMinute +
        rule.sizeSurcharge[input.size];

  return {
    amount: roundUp(Math.max(rule.minimumFare, calculated), config.roundTo),
    distanceKm,
    distanceSource,
  };
}