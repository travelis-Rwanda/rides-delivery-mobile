import type { Party } from '../negotiation/negotiation';
import { breakdownForTotal, driverFareForTotal } from '../pricing/breakdown';

// One delivery after the customer has paid. It moves forward one step at a
// time, and each step belongs to one side:
//   booked      -> driver starts driving to the pickup
//   on-the-way  -> driver collects the parcel
//   in-transit  -> driver delivers it and takes a photo as proof
//   delivered   -> customer confirms it arrived
//   completed   -> customer may tip and rate the driver
export type TripStatus =
  | 'booked'
  | 'on-the-way'
  | 'in-transit'
  | 'delivered'
  | 'completed';

export const tripStatuses: readonly TripStatus[] = [
  'booked',
  'on-the-way',
  'in-transit',
  'delivered',
  'completed',
];

export const tripStatusLabels: Record<TripStatus, string> = {
  booked: 'Booked',
  'on-the-way': 'Driver on the way',
  'in-transit': 'In transit',
  delivered: 'Delivered',
  completed: 'Completed',
};

export const MAX_TIP = 100_000; // whole RWF
export const MAX_REVIEW_LENGTH = 500;

export type Rating = {
  stars: number; // 1 to 5
  review: string; // may be empty
  at: string;
};

export type TripEvent = { status: TripStatus; at: string };

export type Trip = {
  requestId: string;
  driverId: string;
  total: number; // everything the customer paid, packaging included, whole RWF
  negotiated: number; // the price agreed with the driver, fees and tax included
  driverFare: number; // the driver's share of the agreed price, before fees
  status: TripStatus;
  history: TripEvent[]; // every status so far, oldest first
  // The customer acknowledged the pickup. Recorded, but it never holds up the
  // delivery, so a customer who forgets cannot stall the driver.
  pickupConfirmedAt?: string;
  proofPhoto?: string; // the driver's photo of the delivered parcel
  tip?: number; // whole RWF, after completion
  rating?: Rating;
};

export type TripResult =
  | { ok: true; trip: Trip }
  | { ok: false; error: string };

const fail = (error: string): TripResult => ({ ok: false, error });
const ok = (trip: Trip): TripResult => ({ ok: true, trip });

const rank = (status: TripStatus) => tripStatuses.indexOf(status);
const validTime = (value: unknown): value is string =>
  typeof value === 'string' && Number.isFinite(Date.parse(value));

// Starts the trip once the customer has paid. The driver's share comes from
// the price agreed with the driver, so earnings always match the fare split
// the customer saw. Anything paid on top of that, such as packaging, is not
// the driver's.
export function startTrip(
  requestId: string,
  driverId: string,
  negotiated: number,
  total: number,
  now: string,
): TripResult {
  if (!requestId || !driverId) return fail('A delivery needs a request and a driver.');
  if (!validTime(now)) return fail('That time is not valid.');
  const driverFare = driverFareForTotal(negotiated);
  if (driverFare === null)
    return fail('That price is too small to cover the fees.');
  if (!Number.isSafeInteger(total) || total < negotiated)
    return fail('The amount paid cannot be less than the agreed price.');
  return ok({
    requestId,
    driverId,
    total,
    negotiated,
    driverFare,
    status: 'booked',
    history: [{ status: 'booked', at: now }],
  });
}

function wrongStep(trip: Trip, from: TripStatus) {
  return rank(trip.status) > rank(from)
    ? 'That step is already done.'
    : 'That step is not available yet.';
}

function advance(
  trip: Trip,
  from: TripStatus,
  to: TripStatus,
  now: string,
  extra: Partial<Trip> = {},
): TripResult {
  if (trip.status !== from) return fail(wrongStep(trip, from));
  if (!validTime(now)) return fail('That time is not valid.');
  return ok({
    ...trip,
    ...extra,
    status: to,
    history: [...trip.history, { status: to, at: now }],
  });
}

// Driver: set off for the pickup.
export const startDriving = (trip: Trip, now: string) =>
  advance(trip, 'booked', 'on-the-way', now);

// Driver: the parcel is collected, so it is now in transit.
export const pickUp = (trip: Trip, now: string) =>
  advance(trip, 'on-the-way', 'in-transit', now);

// Driver: the parcel is at its destination. A photo is required as proof.
export function deliver(trip: Trip, proofPhoto: string, now: string): TripResult {
  const photo = typeof proofPhoto === 'string' ? proofPhoto.trim() : '';
  if (trip.status === 'in-transit' && !photo)
    return fail('Take a photo of the delivered parcel first.');
  return advance(trip, 'in-transit', 'delivered', now, { proofPhoto: photo });
}

// Customer: the parcel arrived.
export const complete = (trip: Trip, now: string) =>
  advance(trip, 'delivered', 'completed', now);

// Customer: acknowledge the pickup. Does not change the status.
export function confirmPickup(trip: Trip, now: string): TripResult {
  if (trip.status !== 'in-transit')
    return fail(
      rank(trip.status) < rank('in-transit')
        ? 'The parcel has not been picked up yet.'
        : 'The parcel is already on its way or delivered.',
    );
  if (trip.pickupConfirmedAt) return fail('You already confirmed the pickup.');
  if (!validTime(now)) return fail('That time is not valid.');
  return ok({ ...trip, pickupConfirmedAt: now });
}

// What is wrong with a tip amount, or undefined when it is fine to send.
export function tipError(amount: number): string | undefined {
  if (!Number.isSafeInteger(amount) || amount <= 0)
    return 'Enter a tip in whole francs.';
  if (amount > MAX_TIP) return 'That tip is too large.';
  return undefined;
}

// Customer: an optional tip, once, after the delivery is completed.
export function addTip(trip: Trip, amount: number): TripResult {
  if (trip.status !== 'completed')
    return fail('You can tip once the delivery is completed.');
  if (trip.tip !== undefined) return fail('You already tipped this driver.');
  const problem = tipError(amount);
  if (problem) return fail(problem);
  return ok({ ...trip, tip: amount });
}

// Customer: rate the driver, once, after the delivery is completed.
export function rate(
  trip: Trip,
  stars: number,
  review: string,
  now: string,
): TripResult {
  if (trip.status !== 'completed')
    return fail('You can rate once the delivery is completed.');
  if (trip.rating) return fail('You already rated this driver.');
  if (!Number.isInteger(stars) || stars < 1 || stars > 5)
    return fail('Choose from 1 to 5 stars.');
  const text = typeof review === 'string' ? review.trim() : '';
  if (text.length > MAX_REVIEW_LENGTH)
    return fail(`Keep your review under ${MAX_REVIEW_LENGTH} characters.`);
  if (!validTime(now)) return fail('That time is not valid.');
  return ok({ ...trip, rating: { stars, review: text, at: now } });
}

// Who has to act next, or undefined once the delivery is completed.
export function waitingOn(trip: Trip): Party | undefined {
  if (trip.status === 'completed') return undefined;
  return trip.status === 'delivered' ? 'customer' : 'driver';
}

const isRating = (value: unknown): value is Rating => {
  if (!value || typeof value !== 'object') return false;
  const r = value as Record<string, unknown>;
  return (
    Number.isInteger(r.stars) &&
    (r.stars as number) >= 1 &&
    (r.stars as number) <= 5 &&
    typeof r.review === 'string' &&
    r.review.length <= MAX_REVIEW_LENGTH &&
    validTime(r.at)
  );
};

// Used when reading saved data back. A damaged save must never show a step
// that did not happen or inflate what a driver earned.
export function isTrip(value: unknown): value is Trip {
  if (!value || typeof value !== 'object') return false;
  const t = value as Record<string, unknown>;
  if (
    typeof t.requestId !== 'string' ||
    !t.requestId ||
    typeof t.driverId !== 'string' ||
    !t.driverId ||
    typeof t.total !== 'number' ||
    typeof t.negotiated !== 'number' ||
    typeof t.driverFare !== 'number' ||
    typeof t.status !== 'string' ||
    !tripStatuses.includes(t.status as TripStatus) ||
    !Array.isArray(t.history)
  )
    return false;

  const status = t.status as TripStatus;
  const step = rank(status);

  // The driver's share has to be exactly what the agreed price splits into,
  // and the customer cannot have paid less than that price.
  if (!Number.isSafeInteger(t.total) || t.total < t.negotiated) return false;
  const fare = driverFareForTotal(t.negotiated);
  if (fare === null || fare !== t.driverFare) return false;

  // The history is every status up to the current one, in order.
  if (t.history.length !== step + 1) return false;
  const historyOk = t.history.every((event, i) => {
    const e = event as Record<string, unknown> | null;
    return (
      !!e && e.status === tripStatuses[i] && validTime(e.at)
    );
  });
  if (!historyOk) return false;

  // Each extra only exists once its step has been reached.
  if (t.pickupConfirmedAt !== undefined) {
    if (!validTime(t.pickupConfirmedAt) || status === 'booked' || status === 'on-the-way')
      return false;
  }
  const delivered = step >= rank('delivered');
  if (delivered) {
    if (typeof t.proofPhoto !== 'string' || !t.proofPhoto.trim()) return false;
  } else if (t.proofPhoto !== undefined) return false;

  const completed = status === 'completed';
  if (t.tip !== undefined) {
    if (
      !completed ||
      typeof t.tip !== 'number' ||
      !Number.isSafeInteger(t.tip) ||
      t.tip <= 0 ||
      t.tip > MAX_TIP
    )
      return false;
  }
  if (t.rating !== undefined && (!completed || !isRating(t.rating))) return false;
  return true;
}

// The whole saved store: every entry valid, and filed under its own request.
export function isTripArchive(value: unknown): value is Record<string, Trip> {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.entries(value).every(
      ([id, entry]) => isTrip(entry) && entry.requestId === id,
    )
  );
}