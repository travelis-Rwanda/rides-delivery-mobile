import { roundUp } from '../pricing/minimumFare';
import {
  acceptOffer,
  offerId,
  startNegotiation,
  submitOffer,
  threadOf,
  type Negotiation,
  type Result,
} from './negotiation';

// MOCK DATA. Replace this whole file with the Rides driver and offer APIs.
// Driver names and vehicles stand in for existing Rides driver profiles.
export type MockDriver = { id: string; name: string; vehicle: string };

export const mockDrivers: readonly MockDriver[] = [
  { id: 'driver-1', name: 'Eric N.', vehicle: 'Moto Bike' },
  { id: 'driver-2', name: 'Aline U.', vehicle: 'Cab Taxi' },
  { id: 'driver-3', name: 'Jean Paul M.', vehicle: 'Light Hilux' },
];

export const getMockDriver = (id: string) =>
  mockDrivers.find((driver) => driver.id === id);

// Each driver asks for a different share above the minimum fare.
const OPENING_MARKUPS = [1.1, 1.25, 1.4];
const ROUND_TO = 100;

export function openWithMockOffers(
  requestId: string,
  minimumFare: number,
  now: string,
  tripKey?: string,
): Negotiation {
  let n = startNegotiation(requestId, minimumFare, undefined, tripKey);
  mockDrivers.forEach((driver, index) => {
    const amount = roundUp(minimumFare * OPENING_MARKUPS[index], ROUND_TO);
    const result = submitOffer(n, {
      id: offerId(n, driver.id),
      driverId: driver.id,
      by: 'driver',
      amount,
      now,
    });
    if (result.ok) n = result.negotiation;
  });
  return n;
}

// How a mocked driver reacts to the customer's counter-offer: accept if it is
// within 10% of their last ask, otherwise meet in the middle.
export function mockDriverReply(
  n: Negotiation,
  driverId: string,
  now: string,
): Result {
  const thread = threadOf(n, driverId);
  const counter = thread[thread.length - 1];
  const ask = thread[thread.length - 2];
  if (!counter || !ask || counter.by !== 'customer' || counter.status !== 'pending')
    return { ok: false, error: 'There is no counter-offer to answer.' };
  if (counter.amount >= ask.amount * 0.9)
    return acceptOffer(n, counter.id, 'driver');
  const middle = roundUp((ask.amount + counter.amount) / 2, ROUND_TO);
  return submitOffer(n, {
    id: offerId(n, driverId),
    driverId,
    by: 'driver',
    amount: middle,
    now,
  });
}