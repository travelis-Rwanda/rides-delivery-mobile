import { previewEstimate, type DeliveryRequest } from '../delivery/model';
import type { Negotiation } from '../negotiation/negotiation';
import { buildBreakdown, type Breakdown } from './breakdown';
import { isFareService } from './config';
import { minimumFare, type MinimumFare } from './minimumFare';
import { coordinateKey, type Coordinate } from '../maps/places';

// The minimum fare for a saved request, or null when the service is not
// negotiated (restaurant and shop delivery use a fixed fare for now).
export function minimumFareForRequest(
  request: DeliveryRequest,
): MinimumFare | null {
  if (!isFareService(request.service)) return null;
  return minimumFare({
    service: request.service,
    size: request.size,
    roadRoute: request.roadRoute,
    pickupPoint: request.pickupPoint,
    destinationPoint: request.destinationPoint,
  });
}

// Identifies the trip a fare was agreed for. If any part changes, the old
// offers no longer apply. Notes, description and the road route are left out:
// they do not change what the customer asked for.
export function tripKey(request: DeliveryRequest) {
  const place = (text: string, point?: Coordinate) =>
    `${text.trim().toLowerCase()}@${point ? coordinateKey(point) : 'none'}`;
  return [
    request.service,
    request.size,
    place(request.pickup, request.pickupPoint),
    place(request.destination, request.destinationPoint),
  ].join('|');
}

export type RequestPricing =
  | { kind: 'sample'; breakdown: Breakdown } // restaurant and shop: fixed sample fare
  | { kind: 'awaiting'; stale: boolean } // parcel and cargo: no valid agreed fare
  | { kind: 'agreed'; breakdown: Breakdown; driverFare: number };

export function requestPricing(
  request: DeliveryRequest,
  negotiation?: Negotiation,
): RequestPricing {
  const minimum = minimumFareForRequest(request);
  if (!minimum) {
    const sample = previewEstimate(request);
    return {
      kind: 'sample',
      breakdown: buildBreakdown({
        itemsSubtotal: sample.subtotal,
        driverFare: sample.transport,
      }),
    };
  }
  if (!negotiation) return { kind: 'awaiting', stale: false };
    // The trip (or its price floor) changed after offers were made, so those
  // offers no longer apply.
  if (
    negotiation.tripKey !== tripKey(request) ||
    negotiation.minimumFare !== minimum.amount
  )
  return { kind: 'awaiting', stale: true };
  if (negotiation.status !== 'locked' || negotiation.lockedFare === undefined)
    return { kind: 'awaiting', stale: false };
  return {
    kind: 'agreed',
    driverFare: negotiation.lockedFare,
    breakdown: buildBreakdown({ driverFare: negotiation.lockedFare }),
  };
}