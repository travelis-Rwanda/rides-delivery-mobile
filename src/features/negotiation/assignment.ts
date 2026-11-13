import {
  declineOffer,
  finalOfferDeadline,
  offerId,
  submitOffer,
  threadOf,
  type Assignment,
  type Negotiation,
  type Result,
} from './negotiation';
import { rankDrivers, type Driver, type Job } from './selection';


// Each driver's opening price: the first offer they made.
export function openingAsks(n: Negotiation): Record<string, number> {
  const asks: Record<string, number> = {};
  for (const offer of n.offers) {
    if (offer.by === 'driver' && asks[offer.driverId] === undefined)
      asks[offer.driverId] = offer.amount;
  }
  return asks;
}

// Match the delivery to a driver: nearest to the pickup when urgent, the
// cheapest otherwise. The whole ranking is saved so we can move to the next
// best driver later without working it out again.
export function assignDriver(
  n: Negotiation,
  job: Job,
  drivers: readonly Driver[],
): Negotiation {
  const choice = rankDrivers({ ...job, drivers, asks: openingAsks(n) });
  const order = choice.ranked.map((entry) => entry.driver.id);
  return {
    ...n,
    assignment: {
      order,
      basis: choice.basis,
      fellBack: choice.fellBack,
      current: order[0],
      tried: [],
    },
  };
}

// A driver has failed when their last offer was declined, by either side.
// This covers both a refusal and haggling that ran out of rounds.
export function driverFailed(n: Negotiation, driverId: string): boolean {
  const thread = threadOf(n, driverId);
  const last = thread[thread.length - 1];
  return !last || last.status === 'declined' || last.status === 'expired';
}

// The customer's most recent price, wherever it was made. Only the driver in
// play can be sent a price, so this is the price they last stood behind.
function lastCustomerOffer(n: Negotiation) {
  return [...n.offers].reverse().find((offer) => offer.by === 'customer');
}

// Pass the customer's last price on to a driver who has just been matched, so
// they start from what the customer was offering, not from nothing. It counts
// as the customer's first message in that driver's chat. If the customer never
// named a price, or it cannot be sent, the driver just keeps their own opening
// offer.
function carryOffer(n: Negotiation, toDriver: string, now: string) {
  const price = lastCustomerOffer(n);
  if (!price) return n;
  const result = submitOffer(n, {
    id: offerId(n, toDriver),
    driverId: toDriver,
    by: 'customer',
    amount: price.amount,
    now,
    carriedFrom: price.driverId,
  });
  return result.ok ? result.negotiation : n;
}

// If the current driver has failed, move to the next best driver who has not
// been tried, and pass on the customer's last price to them. Does nothing when
// the current driver is still in play, when the fare is locked, or when there
// is no assignment.
export function advanceDriver(
  n: Negotiation,
  now: string = new Date().toISOString(),
): Negotiation {
  const assignment = n.assignment;
  if (!assignment || n.status === 'locked') return n;

  let { current, tried } = assignment;
  while (current !== undefined && driverFailed(n, current)) {
    tried = [...tried, current];
    current = assignment.order.find((id) => !tried.includes(id));
  }
  if (current === assignment.current) return n;
  const moved = { ...n, assignment: { ...assignment, current, tried } };
  return current === undefined ? moved : carryOffer(moved, current, now);
}

// Decline an offer, then hand over to the next best driver if that ended
// this driver's chance.
export function declineAndAdvance(
  n: Negotiation,
  offerId: string,
  responder: 'driver' | 'customer',
  now: string = new Date().toISOString(),
): Result {
  const result = declineOffer(n, offerId, responder);
  if (!result.ok) return result;
  return { ok: true, negotiation: advanceDriver(result.negotiation, now) };
}

// When a driver's chat hits the round limit, the last offer gets a short window
// to be accepted. If that runs out, the offer expires and the delivery moves on
// to the next best driver with the customer's last price, as if the driver had
// passed. Returns the same object when nothing has run out.
export function expireFinalOffer(
  n: Negotiation,
  nowMs: number,
  windowMs?: number,
): Negotiation {
  const deadline = finalOfferDeadline(n, windowMs);
  const current = n.assignment?.current;
  if (deadline === undefined || current === undefined || nowMs < deadline)
    return n;
  const last = threadOf(n, current).at(-1)!;
  const expired: Negotiation = {
    ...n,
    offers: n.offers.map((offer) =>
      offer.id === last.id ? { ...offer, status: 'expired' as const } : offer,
    ),
  };
  return advanceDriver(expired, new Date(nowMs).toISOString());
}

// Every saved negotiation, with the ones whose final offer ran out moved on.
// Returns the same object when nothing changed, so callers can tell cheaply.
export function expireAll(
  negotiations: Readonly<Record<string, Negotiation>>,
  nowMs: number,
  windowMs?: number,
): Record<string, Negotiation> {
  let changed = false;
  const next: Record<string, Negotiation> = {};
  for (const [id, negotiation] of Object.entries(negotiations)) {
    const updated = expireFinalOffer(negotiation, nowMs, windowMs);
    if (updated !== negotiation) changed = true;
    next[id] = updated;
  }
  return changed ? next : (negotiations as Record<string, Negotiation>);
}

// One line telling the customer why this driver was chosen.
export function matchSummary(
  assignment: Assignment,
  distanceKm: number | null,
): string {
  if (assignment.fellBack)
    return 'Lowest price available. Your pickup isn’t pinned on the map, so we couldn’t find the nearest driver.';
  if (assignment.basis === 'nearest')
    return distanceKm === null
      ? 'Nearest to your pickup'
      : `Nearest to your pickup, about ${distanceKm.toFixed(1)} km away`;
  return 'Lowest price available';
}