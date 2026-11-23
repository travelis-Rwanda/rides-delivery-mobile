/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { openWithMockOffers } from '../src/features/negotiation/mockDrivers';
import { declineAndAdvance } from '../src/features/negotiation/assignment';
import {
  acceptOffer,
  threadOf,
  type Negotiation,
} from '../src/features/negotiation/negotiation';
import type { Job } from '../src/features/negotiation/selection';
import type { Payment, PaymentAttempt } from '../src/features/payments/payment';
import {
  lockedDriverId,
  syncTrips,
  tipPaymentId,
} from '../src/features/trips/sync';
import {
  complete,
  deliver,
  isTrip,
  pickUp,
  startDriving,
  startTrip,
  type Trip,
  type TripResult,
} from '../src/features/trips/trip';

const at = (seconds: number) =>
  new Date(Date.parse('2026-11-20T10:00:00.000Z') + seconds * 1000).toISOString();
const standard: Job = { service: 'parcel', size: 'Small', urgent: false };

// A fare agreed with the first driver. With passFirst, the customer turns the
// first offer down and agrees the fare with the second driver instead.
function locked(requestId: string, passFirst = false): Negotiation {
  let n = openWithMockOffers(requestId, 3000, at(0), 'trip', standard);
  if (passFirst) {
    const passed = declineAndAdvance(
      n,
      threadOf(n, 'driver-1').at(-1)!.id,
      'customer', // the customer turns down the first driver's offer
      at(10),
    );
    assert.ok(passed.ok);
    n = passed.negotiation;
  }
  const holder = n.assignment!.current!;
  const result = acceptOffer(n, threadOf(n, holder).at(-1)!.id, 'customer');
  assert.ok(result.ok);
  return result.negotiation;
}

const attempt = (
  requestId: string,
  amount: number,
  status: PaymentAttempt['status'],
  updatedAt = at(60),
): PaymentAttempt => ({
  id: `${requestId}:pay:1`,
  method: 'mtn_momo',
  phone: '+250788000000',
  amount,
  status,
  createdAt: at(30),
  updatedAt,
});

const payment = (
  requestId: string,
  amount: number,
  status: PaymentAttempt['status'] = 'succeeded',
  updatedAt = at(60),
): Payment => ({
  requestId,
  amount,
  attempts: [attempt(requestId, amount, status, updatedAt)],
});

test('the driver comes from the offer that locked the fare', () => {
  assert.equal(lockedDriverId(locked('r1')), 'driver-1');
  assert.equal(lockedDriverId(locked('r1', true)), 'driver-2');
  const open = openWithMockOffers('r1', 3000, at(0), 'trip', standard);
  assert.equal(lockedDriverId(open), undefined);
  assert.equal(lockedDriverId(undefined), undefined);
});

test('a paid request starts a trip with the agreed driver and fare', () => {
  const n = locked('r1');
  const fare = n.lockedFare!;
  const next = syncTrips({}, { r1: payment('r1', fare) }, { r1: n });
  const trip = next.r1;
  assert.equal(trip.status, 'booked');
  assert.equal(trip.driverId, 'driver-1');
  assert.equal(trip.negotiated, fare);
  assert.equal(trip.total, fare);
  assert.deepEqual(trip.history, [{ status: 'booked', at: at(60) }]);
  assert.ok(isTrip(trip));
});

test('packaging is paid on top and stays out of the driver’s share', () => {
  const n = locked('r1');
  const fare = n.lockedFare!;
  const plain = syncTrips({}, { r1: payment('r1', fare) }, { r1: n }).r1;
  const packed = syncTrips({}, { r1: payment('r1', fare + 700) }, { r1: n }).r1;
  assert.equal(packed.total, fare + 700);
  assert.equal(packed.negotiated, fare);
  assert.equal(packed.driverFare, plain.driverFare);
});

test('nothing starts until the payment has succeeded', () => {
  const n = locked('r1');
  const fare = n.lockedFare!;
  for (const status of ['initiated', 'pending', 'failed', 'cancelled'] as const) {
    const trips = {};
    assert.equal(
      syncTrips(trips, { r1: payment('r1', fare, status) }, { r1: n }),
      trips,
      status,
    );
  }
  const none = {};
  assert.equal(
    syncTrips(none, { r1: { requestId: 'r1', amount: fare, attempts: [] } }, { r1: n }),
    none,
  );
});

test('a paid request with no agreed driver starts nothing', () => {
  const n = locked('r1');
  const open = openWithMockOffers('r1', 3000, at(0), 'trip', standard);
  const trips = {};
  assert.equal(syncTrips(trips, { r1: payment('r1', n.lockedFare!) }, { r1: open }), trips);
  assert.equal(syncTrips(trips, { r1: payment('r1', n.lockedFare!) }, {}), trips);
});

test('a payment smaller than the agreed price starts nothing', () => {
  const n = locked('r1');
  const trips = {};
  assert.equal(syncTrips(trips, { r1: payment('r1', n.lockedFare! - 1) }, { r1: n }), trips);
});

test('an existing trip is never replaced or changed', () => {
  const n = locked('r1');
  const fare = n.lockedFare!;
  const existing = (
    startTrip('r1', 'driver-3', fare, fare, at(5)) as { ok: true; trip: Trip }
  ).trip;
  const trips = { r1: existing };
  const next = syncTrips(trips, { r1: payment('r1', fare) }, { r1: n });
  assert.equal(next, trips);
  assert.equal(next.r1.driverId, 'driver-3');
});

test('it returns the same object when there is nothing to add, and adds only paid ones', () => {
  const a = locked('r1');
  const b = locked('r2', true);
  const payments = {
    r1: payment('r1', a.lockedFare!),
    r2: payment('r2', b.lockedFare!, 'pending'),
  };
  const once = syncTrips({}, payments, { r1: a, r2: b });
  assert.deepEqual(Object.keys(once), ['r1']);
  assert.equal(syncTrips(once, payments, { r1: a, r2: b }), once);

  const paidLater = { ...payments, r2: payment('r2', b.lockedFare!) };
  const twice = syncTrips(once, paidLater, { r1: a, r2: b });
  assert.deepEqual(Object.keys(twice).sort(), ['r1', 'r2']);
  assert.equal(twice.r1, once.r1);
  assert.equal(twice.r2.driverId, 'driver-2');
});

// ---- Tips ----

const must = (result: TripResult): Trip => {
  assert.ok(result.ok);
  return result.trip;
};

function completedTrip(requestId: string, fare: number): Trip {
  let trip = must(startTrip(requestId, 'driver-1', fare, fare, at(0)));
  trip = must(startDriving(trip, at(5)));
  trip = must(pickUp(trip, at(15)));
  trip = must(deliver(trip, 'proof.jpg', at(40)));
  return must(complete(trip, at(45)));
}

const FARE = 3300;

test('a tip is filed under its own payment id', () => {
  assert.equal(tipPaymentId('r1'), 'r1:tip');
});

test('a paid tip is recorded on the completed delivery', () => {
  const trips = { r1: completedTrip('r1', FARE) };
  const payments = { 'r1:tip': payment('r1:tip', 1000) };
  const next = syncTrips(trips, payments, {});
  assert.equal(next.r1.tip, 1000);
  assert.equal(trips.r1.tip, undefined); // the original is untouched
  assert.ok(isTrip(next.r1));
});

test('a tip that was not paid is not recorded', () => {
  const trips = { r1: completedTrip('r1', FARE) };
  for (const status of ['initiated', 'pending', 'failed', 'cancelled'] as const)
    assert.equal(
      syncTrips(trips, { 'r1:tip': payment('r1:tip', 1000, status) }, {}),
      trips,
      status,
    );
  assert.equal(syncTrips(trips, {}, {}), trips);
});

test('a tip is recorded once and never changed', () => {
  const trips = { r1: completedTrip('r1', FARE) };
  const payments = { 'r1:tip': payment('r1:tip', 1000) };
  const once = syncTrips(trips, payments, {});
  assert.equal(syncTrips(once, payments, {}), once);
  const bigger = { 'r1:tip': payment('r1:tip', 5000) };
  assert.equal(syncTrips(once, bigger, {}).r1.tip, 1000);
});

test('a tip is only recorded once the delivery is completed', () => {
  const early = must(startTrip('r1', 'driver-1', FARE, FARE, at(0)));
  const trips = { r1: early };
  assert.equal(
    syncTrips(trips, { 'r1:tip': payment('r1:tip', 1000) }, {}),
    trips,
  );
});

test('a tip payment never starts a delivery of its own', () => {
  const n = locked('r1');
  const trips = {};
  const next = syncTrips(
    trips,
    { 'r1:tip': payment('r1:tip', 1000) },
    { r1: n },
  );
  assert.equal(next, trips);
});

test('a tip too large to record is left alone', () => {
  const trips = { r1: completedTrip('r1', FARE) };
  assert.equal(
    syncTrips(trips, { 'r1:tip': payment('r1:tip', 999_999_999) }, {}),
    trips,
  );
});