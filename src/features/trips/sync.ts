import type { Negotiation } from '../negotiation/negotiation';
import { paidAttempt, type Payment } from '../payments/payment';
import { addTip, startTrip, type Trip } from './trip';

// The driver the customer agreed a fare with, once the fare is locked.
export function lockedDriverId(
  negotiation: Negotiation | undefined,
): string | undefined {
  if (!negotiation || negotiation.status !== 'locked') return undefined;
  if (!negotiation.lockedOfferId) return undefined;
  return negotiation.offers.find(
    (offer) => offer.id === negotiation.lockedOfferId,
  )?.driverId;
}

// The tip is paid through the same Mobile Money flow as the delivery, as its own
// payment filed under this id.
export const tipPaymentId = (requestId: string) => `${requestId}:tip`;

// A delivery starts the moment its payment succeeds, and a completed delivery
// records its tip the moment the tip payment succeeds. This adds a trip for
// every paid request that does not have one yet, records every paid tip, and
// never touches anything else. It returns the same object when there is
// nothing to change.
export function syncTrips(
  trips: Record<string, Trip>,
  payments: Record<string, Payment>,
  negotiations: Record<string, Negotiation>,
): Record<string, Trip> {
  let next = trips;
  for (const payment of Object.values(payments)) {
    if (next[payment.requestId]) continue;
    const paid = paidAttempt(payment);
    const negotiation = negotiations[payment.requestId];
    const driverId = lockedDriverId(negotiation);
    if (!paid || !negotiation || !driverId) continue;
    if (negotiation.lockedFare === undefined) continue;
    const started = startTrip(
      payment.requestId,
      driverId,
      negotiation.lockedFare,
      payment.amount,
      paid.updatedAt,
    );
    if (!started.ok) continue;
    if (next === trips) next = { ...trips };
    next[payment.requestId] = started.trip;
  }
  for (const [requestId, trip] of Object.entries(next)) {
    if (trip.status !== 'completed' || trip.tip !== undefined) continue;
    const tipPayment = payments[tipPaymentId(requestId)];
    if (!tipPayment || !paidAttempt(tipPayment)) continue;
    const tipped = addTip(trip, tipPayment.amount);
    if (!tipped.ok) continue;
    if (next === trips) next = { ...trips };
    next[requestId] = tipped.trip;
  }
  return next;
}