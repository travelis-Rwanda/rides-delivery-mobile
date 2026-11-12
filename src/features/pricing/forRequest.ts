import { previewEstimate, type DeliveryRequest } from '../delivery/model';
import type { Negotiation } from '../negotiation/negotiation';
import {
  breakdownForTotal,
  buildBreakdown,
  totalForDriverFare,
  type Breakdown,
} from './breakdown';
import { isFareService, pricingConfig } from './config';
import { addPackaging } from './packaging';
import { minimumFare, roundUp, type MinimumFare } from './minimumFare';
import { coordinateKey, type Coordinate } from '../maps/places';

// The lowest total a saved request can be negotiated at, or null when the
// service is not negotiated (restaurant and shop delivery use a fixed fare for
// now). Customer and driver agree one total that already includes the service
// fee and tax, so the floor is the total for the lowest allowed driver fare,
// rounded up to a clean figure.
export function minimumFareForRequest(
  request: DeliveryRequest,
): MinimumFare | null {
  if (!isFareService(request.service)) return null;
  const fare = minimumFare({
    service: request.service,
    size: request.size,
    roadRoute: request.roadRoute,
    pickupPoint: request.pickupPoint,
    destinationPoint: request.destinationPoint,
  });
  return {
    ...fare,
    amount: roundUp(totalForDriverFare(fare.amount), pricingConfig.roundTo),
  };
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
    // Standard requests keep the same key as before, so offers already made
    // for them are not thrown away.
    ...(request.urgent ? ['urgent'] : []),
  ].join('|');
}

export type RequestPricing =
  | { kind: 'sample'; breakdown: Breakdown } // restaurant and shop: fixed sample fare
  | { kind: 'awaiting'; stale: boolean } // parcel and cargo: no valid agreed fare
  // `negotiated` is the price agreed with the driver, fees and tax included.
  // `total` is everything the customer pays: that plus packaging, if chosen.
  // `driverFare` is the driver's share of the negotiated price.
  | {
      kind: 'agreed';
      breakdown: Breakdown;
      negotiated: number;
      total: number;
      driverFare: number;
    };

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
  // The agreed amount is the total. Split it back into the driver's fare, the
  // service fee and the tax. A total too small to cover the fees is not valid.
  const split = breakdownForTotal(negotiation.lockedFare);
  if (!split) return { kind: 'awaiting', stale: true };
  // Packaging is a separate fee outside the negotiated price.
  const breakdown = request.packaging
    ? addPackaging(split, request.size)
    : split;
  return {
    kind: 'agreed',
    negotiated: negotiation.lockedFare,
    total: breakdown.total,
    driverFare:
      split.lines.find((line) => line.key === 'driverFare')?.amount ?? 0,
    breakdown,
  };
}