/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { totalForDriverFare } from '../src/features/pricing/breakdown';
import {
  MAX_REVIEW_LENGTH,
  MAX_TIP,
  addTip,
  complete,
  confirmPickup,
  deliver,
  isTrip,
  isTripArchive,
  pickUp,
  rate,
  startDriving,
  startTrip,
  tipError,
  tripStatusLabels,
  tripStatuses,
  waitingOn,
  type Trip,
  type TripResult,
} from '../src/features/trips/trip';

const START = Date.parse('2026-11-20T10:00:00.000Z');
const at = (minutes: number) => new Date(START + minutes * 60_000).toISOString();
const TOTAL = totalForDriverFare(3000);

function must(result: TripResult): Trip {
  assert.ok(result.ok, result.ok ? '' : result.error);
  return result.trip;
}
const error = (result: TripResult) => (result.ok ? '' : result.error);

const booked = () => must(startTrip('r1', 'driver-1', TOTAL, TOTAL, at(0)))
const onTheWay = () => must(startDriving(booked(), at(5)));
const inTransit = () => must(pickUp(onTheWay(), at(15)));
const delivered = () => must(deliver(inTransit(), 'file:///proof.jpg', at(40)));
const completed = () => must(complete(delivered(), at(45)));

test('a trip starts booked, with the driver’s share worked out from the total', () => {
  const trip = booked();
  assert.equal(trip.status, 'booked');
  assert.equal(trip.driverFare, 3000);
  assert.equal(trip.negotiated, TOTAL);
  assert.equal(trip.total, TOTAL);
  assert.deepEqual(trip.history, [{ status: 'booked', at: at(0) }]);
  assert.equal(trip.proofPhoto, undefined);
  assert.ok(isTrip(trip));
});

test('a trip needs a request, a driver, a workable total and a real time', () => {
  assert.equal(startTrip('', 'driver-1', TOTAL, TOTAL, at(0)).ok, false);
  assert.equal(startTrip('r1', '', TOTAL, TOTAL, at(0)).ok, false);
  assert.equal(startTrip('r1', 'driver-1', 10, 10, at(0)).ok, false);
  assert.equal(startTrip('r1', 'driver-1', 3500.5, 3500.5, at(0)).ok, false);
  assert.equal(startTrip('r1', 'driver-1', TOTAL, TOTAL, 'later').ok, false);
});

test('packaging is paid on top and never counts as the driver’s money', () => {
  const trip = must(startTrip('r1', 'driver-1', TOTAL, TOTAL + 700, at(0)));
  assert.equal(trip.total, TOTAL + 700);
  assert.equal(trip.negotiated, TOTAL);
  assert.equal(trip.driverFare, 3000);
  assert.ok(isTrip(trip));
  // Paying less than the agreed price is not possible.
  assert.equal(startTrip('r1', 'driver-1', TOTAL, TOTAL - 1, at(0)).ok, false);
});

test('the whole journey runs in order and keeps its history', () => {
  const trip = completed();
  assert.equal(trip.status, 'completed');
  assert.deepEqual(
    trip.history.map((event) => event.status),
    [...tripStatuses],
  );
  assert.deepEqual(
    trip.history.map((event) => event.at),
    [at(0), at(5), at(15), at(40), at(45)],
  );
  assert.equal(trip.proofPhoto, 'file:///proof.jpg');
  assert.ok(isTrip(trip));
});

test('steps cannot be skipped', () => {
  const b = booked();
  assert.equal(error(pickUp(b, at(1))), 'That step is not available yet.');
  assert.equal(
    error(deliver(b, 'file:///p.jpg', at(1))),
    'That step is not available yet.',
  );
  assert.equal(error(complete(b, at(1))), 'That step is not available yet.');
  assert.equal(
    error(complete(inTransit(), at(50))),
    'That step is not available yet.',
  );
});

test('steps cannot be repeated', () => {
  assert.equal(error(startDriving(onTheWay(), at(6))), 'That step is already done.');
  assert.equal(error(pickUp(inTransit(), at(16))), 'That step is already done.');
  assert.equal(
    error(deliver(delivered(), 'file:///p.jpg', at(41))),
    'That step is already done.',
  );
  assert.equal(error(complete(completed(), at(46))), 'That step is already done.');
});

test('delivering needs a photo as proof', () => {
  const t = inTransit();
  assert.equal(
    error(deliver(t, '', at(40))),
    'Take a photo of the delivered parcel first.',
  );
  assert.equal(error(deliver(t, '   ', at(40))).length > 0, true);
  const done = must(deliver(t, '  file:///proof.jpg  ', at(40)));
  assert.equal(done.proofPhoto, 'file:///proof.jpg');
});

test('a time that is not valid is refused and changes nothing', () => {
  const b = booked();
  assert.equal(error(startDriving(b, 'soon')), 'That time is not valid.');
  assert.equal(b.status, 'booked');
});

test('a step never changes the trip it was given', () => {
  const b = booked();
  const snapshot = JSON.stringify(b);
  startDriving(b, at(5));
  assert.equal(JSON.stringify(b), snapshot);
});

test('the customer can confirm the pickup once, without holding anything up', () => {
  const t = inTransit();
  const confirmed = must(confirmPickup(t, at(16)));
  assert.equal(confirmed.status, 'in-transit');
  assert.equal(confirmed.pickupConfirmedAt, at(16));
  assert.equal(error(confirmPickup(confirmed, at(17))), 'You already confirmed the pickup.');
  // The driver carries on whether or not the customer confirmed.
  assert.equal(must(deliver(t, 'file:///p.jpg', at(40))).status, 'delivered');
  assert.equal(must(deliver(confirmed, 'file:///p.jpg', at(40))).status, 'delivered');
  assert.ok(isTrip(confirmed));
});

test('the pickup can only be confirmed while the parcel is in transit', () => {
  assert.equal(error(confirmPickup(booked(), at(1))), 'The parcel has not been picked up yet.');
  assert.equal(error(confirmPickup(onTheWay(), at(6))), 'The parcel has not been picked up yet.');
  assert.equal(
    error(confirmPickup(delivered(), at(41))),
    'The parcel is already on its way or delivered.',
  );
});

test('it is always clear who has to act next', () => {
  assert.equal(waitingOn(booked()), 'driver');
  assert.equal(waitingOn(onTheWay()), 'driver');
  assert.equal(waitingOn(inTransit()), 'driver');
  assert.equal(waitingOn(delivered()), 'customer');
  assert.equal(waitingOn(completed()), undefined);
});

test('every status has a label', () => {
  for (const status of tripStatuses) assert.ok(tripStatusLabels[status]);
  assert.equal(tripStatusLabels['on-the-way'], 'Driver on the way');
});

test('a tip is optional, whole francs, once, and only after completion', () => {
  assert.equal(error(addTip(delivered(), 1000)), 'You can tip once the delivery is completed.');
  const tipped = must(addTip(completed(), 1000));
  assert.equal(tipped.tip, 1000);
  assert.equal(error(addTip(tipped, 500)), 'You already tipped this driver.');
  for (const bad of [0, -500, 250.5, Number.NaN, Infinity])
    assert.equal(addTip(completed(), bad).ok, false, String(bad));
  assert.equal(addTip(completed(), MAX_TIP).ok, true);
  assert.equal(addTip(completed(), MAX_TIP + 1).ok, false);
  assert.ok(isTrip(tipped));
});

test('a tip amount is checked the same way before and after it is sent', () => {
  assert.equal(tipError(1000), undefined);
  assert.equal(tipError(MAX_TIP), undefined);
  assert.equal(tipError(MAX_TIP + 1), 'That tip is too large.');
  for (const bad of [0, -1, 2.5, Number.NaN, Infinity])
    assert.equal(tipError(bad), 'Enter a tip in whole francs.', String(bad));
});

test('a rating is 1 to 5 stars, once, and only after completion', () => {
  assert.equal(
    error(rate(delivered(), 5, '', at(50))),
    'You can rate once the delivery is completed.',
  );
  const rated = must(rate(completed(), 4, '  Careful and quick.  ', at(50)));
  assert.deepEqual(rated.rating, { stars: 4, review: 'Careful and quick.', at: at(50) });
  assert.equal(error(rate(rated, 5, '', at(51))), 'You already rated this driver.');
  for (const bad of [0, 6, 3.5, Number.NaN])
    assert.equal(rate(completed(), bad, '', at(50)).ok, false, String(bad));
  assert.equal(rate(completed(), 5, '', at(50)).ok, true); // the review is optional
  assert.equal(rate(completed(), 5, 'x'.repeat(MAX_REVIEW_LENGTH), at(50)).ok, true);
  assert.equal(rate(completed(), 5, 'x'.repeat(MAX_REVIEW_LENGTH + 1), at(50)).ok, false);
  assert.equal(rate(completed(), 5, '', 'never').ok, false);
  assert.ok(isTrip(rated));
});

test('a tip and a rating can both be added, in either order', () => {
  const a = must(rate(must(addTip(completed(), 500)), 5, 'Great', at(50)));
  const b = must(addTip(must(rate(completed(), 5, 'Great', at(50))), 500));
  assert.deepEqual(a, b);
  assert.ok(isTrip(a));
});

test('every state survives being saved and read back', () => {
  for (const trip of [booked(), onTheWay(), inTransit(), delivered(), completed()])
    assert.ok(isTrip(JSON.parse(JSON.stringify(trip))), trip.status);
});

test('a damaged save is rejected', () => {
  const bad = (change: (t: any) => void, base: Trip = completed()) => {
    const copy = JSON.parse(JSON.stringify(base));
    change(copy);
    assert.equal(isTrip(copy), false);
  };
  bad((t) => (t.driverFare = 99_999)); // inflated earnings
  bad((t) => (t.negotiated = 10));
  bad((t) => (t.total = t.negotiated - 1)); // paid less than agreed
  bad((t) => (t.total = 1000.5));
  bad((t) => (t.status = 'lost'));
  bad((t) => (t.requestId = ''));
  bad((t) => (t.driverId = 7));
  bad((t) => t.history.pop()); // a step with no record
  bad((t) => t.history.reverse());
  bad((t) => (t.history[2].at = 'whenever'));
  bad((t) => delete t.proofPhoto); // delivered without proof
  bad((t) => (t.proofPhoto = '   '));
  bad((t) => (t.proofPhoto = 'file:///p.jpg'), booked()); // proof before delivery
  bad((t) => (t.tip = 500), delivered()); // tip before completion
  bad((t) => (t.tip = -5));
  bad((t) => (t.tip = 12.5));
  bad((t) => (t.rating = { stars: 9, review: '', at: at(1) }));
  bad((t) => (t.rating = { stars: 5, review: '', at: at(1) }), delivered());
  bad((t) => (t.pickupConfirmedAt = at(1)), booked());
  bad((t) => (t.pickupConfirmedAt = at(1)), onTheWay());
  assert.equal(isTrip(null), false);
  assert.equal(isTrip('trip'), false);
});

test('the saved store must be filed under each trip’s own request', () => {
  const trip = completed();
  assert.ok(isTripArchive({ r1: trip }));
  assert.ok(isTripArchive({}));
  assert.equal(isTripArchive({ other: trip }), false);
  assert.equal(isTripArchive({ r1: { ...trip, status: 'x' } }), false);
  assert.equal(isTripArchive([trip]), false);
  assert.equal(isTripArchive(null), false);
});