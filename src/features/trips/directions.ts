import type { DeliveryRequest } from '../delivery/model';
import type { Coordinate } from '../maps/places';

export type Stop = 'pickup' | 'destination';

const point = (c: Coordinate) => `${c.latitude},${c.longitude}`;

// A link that opens the phone's maps app with directions to one end of the
// trip. It uses the exact spot when the customer picked one on the map, and
// falls back to searching for the address they typed.
export function directionsUrl(
  request: Pick<
    DeliveryRequest,
    'pickup' | 'pickupPoint' | 'destination' | 'destinationPoint'
  >,
  stop: Stop,
): string {
  const target =
    stop === 'pickup'
      ? (request.pickupPoint ?? request.pickup.trim())
      : (request.destinationPoint ?? request.destination.trim());
  const destination =
    typeof target === 'string' ? target : point(target);
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;
}