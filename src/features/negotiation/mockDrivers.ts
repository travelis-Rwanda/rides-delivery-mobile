import { roundUp } from '../pricing/minimumFare';
import { assignDriver } from './assignment';
import {
  acceptOffer,
  offerId,
  startNegotiation,
  submitOffer,
  threadOf,
  type Negotiation,
  type Result,
} from './negotiation';
import { kigaliPlaces } from '../maps/places';
import { vehicleFits, type Driver, type Job } from './selection';

// MOCK DATA to be replaced with the Rides driver and offer APIs.
// Driver names, vehicles and positions stand in for existing Rides driver
// profiles and their live location.
export type MockDriver = Driver;

export const mockDrivers: readonly MockDriver[] = [
  {
    id: 'driver-1',
    name: 'Eric N.',
    vehicle: 'Moto Bike',
    kind: 'moto',
    location: kigaliPlaces.kimironko,
  },
  {
    id: 'driver-2',
    name: 'Aline U.',
    vehicle: 'Cab Taxi',
    kind: 'cab',
    location: kigaliPlaces.kimihurura,
  },
  {
    id: 'driver-3',
    name: 'Jean Paul M.',
    vehicle: 'Light Hilux',
    kind: 'hilux',
    location: kigaliPlaces.nyamirambo,
  },
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
  job?: Job,
): Negotiation {
  let n = startNegotiation(requestId, minimumFare, undefined, tripKey);
  mockDrivers.forEach((driver, index) => {
    // Only drivers whose vehicle can carry the job make an offer.
    if (job && !vehicleFits(driver.kind, job)) return;
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
  // With a job, match the delivery to one driver. Without one, every driver
  // stays open to the customer, as before.
  return job ? assignDriver(n, job, mockDrivers) : n;
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