import {
  declineOffer,
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
  return !last || last.status === 'declined';
}

// If the current driver has failed, move to the next best driver who has not
// been tried. Does nothing when the current driver is still in play, when the
// fare is locked, or when there is no assignment.
export function advanceDriver(n: Negotiation): Negotiation {
  const assignment = n.assignment;
  if (!assignment || n.status === 'locked') return n;

  let { current, tried } = assignment;
  while (current !== undefined && driverFailed(n, current)) {
    tried = [...tried, current];
    current = assignment.order.find((id) => !tried.includes(id));
  }
  if (current === assignment.current) return n;
  return { ...n, assignment: { ...assignment, current, tried } };
}

// Decline an offer, then hand over to the next best driver if that ended
// this driver's chance.
export function declineAndAdvance(
  n: Negotiation,
  offerId: string,
  responder: 'driver' | 'customer',
): Result {
  const result = declineOffer(n, offerId, responder);
  if (!result.ok) return result;
  return { ok: true, negotiation: advanceDriver(result.negotiation) };
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