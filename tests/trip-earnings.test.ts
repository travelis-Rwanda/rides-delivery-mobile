/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { totalForDriverFare } from '../src/features/pricing/breakdown';
import {
  completedAt,
  driverEarnings,
  earningsHistory,
  startOfDay,
  startOfWeek,
} from '../src/features/trips/earnings';
import {
  addTip,
  complete,
  deliver,
  pickUp,
  rate,
  startDriving,
  startTrip,
  type Trip,
  type TripResult,
} from '../src/features/trips/trip';

const must = (result: TripResult): Trip => {
  assert.ok(result.ok);
  return result.trip;
};

// Times are built on the phone's own clock, as the app reads them, so these
// tests give the same answer in every time zone.
const local = (day: number, hour = 12, minute = 0) =>
  new Date(2026, 10, day, hour, minute).toISOString();

// Wednesday 18 November 2026. Its week started on Monday the 16th.
const WEDNESDAY = new Date(2026, 10, 18, 15, 0).getTime();
const SUNDAY = new Date(2026, 10, 22, 12, 0).getTime();

function completedTrip(
  requestId: string,
  driverId: string,
  fare: number,
  completedIso: string,
  extras: { tip?: number; stars?: number } = {},
): Trip {
  const total = totalForDriverFare(fare);
  let trip = must(startTrip(requestId, driverId, total, total, completedIso));
  trip = must(startDriving(trip, completedIso));
  trip = must(pickUp(trip, completedIso));
  trip = must(deliver(trip, 'proof.jpg', completedIso));
  trip = must(complete(trip, completedIso));
  if (extras.tip) trip = must(addTip(trip, extras.tip));
  if (extras.stars) trip = must(rate(trip, extras.stars, '', completedIso));
  return trip;
}

const store = (...trips: Trip[]) =>
  Object.fromEntries(trips.map((trip) => [trip.requestId, trip]));

test('the week starts on Monday and the day at midnight', () => {
  assert.equal(startOfDay(WEDNESDAY), new Date(2026, 10, 18).getTime());
  assert.equal(startOfWeek(WEDNESDAY), new Date(2026, 10, 16).getTime());
  assert.equal(startOfWeek(SUNDAY), new Date(2026, 10, 16).getTime());
  // On a Monday the week starts that very day.
  assert.equal(
    startOfWeek(new Date(2026, 10, 16, 8, 0).getTime()),
    new Date(2026, 10, 16).getTime(),
  );
});

test('a driver’s earnings are their fare share, never the fees', () => {
  const trips = store(completedTrip('r1', 'driver-1', 3000, local(18, 9)));
  const summary = driverEarnings(trips, 'driver-1', WEDNESDAY);
  assert.equal(summary.today, 3000);
  assert.equal(summary.allTime, 3000);
  assert.ok(totalForDriverFare(3000) > 3000); // the customer paid more
});

test('tips count toward the earnings of the delivery they belong to', () => {
  const trips = store(
    completedTrip('r1', 'driver-1', 3000, local(18, 9), { tip: 1000 }),
  );
  const [row] = earningsHistory(trips, 'driver-1');
  assert.deepEqual(row, {
    requestId: 'r1',
    completedAt: local(18, 9),
    fare: 3000,
    tip: 1000,
    total: 4000,
  });
  assert.equal(driverEarnings(trips, 'driver-1', WEDNESDAY).today, 4000);
});

test('today, this week and all time each cover the right deliveries', () => {
  const trips = store(
    completedTrip('today-start', 'driver-1', 1000, local(18, 0, 0)),
    completedTrip('today', 'driver-1', 2000, local(18, 9)),
    completedTrip('yesterday', 'driver-1', 4000, local(17, 23, 59)),
    completedTrip('monday', 'driver-1', 8000, local(16, 0, 0)),
    completedTrip('last-sunday', 'driver-1', 16000, local(15, 23, 59)),
    completedTrip('old', 'driver-1', 32000, local(2, 12)),
  );
  const summary = driverEarnings(trips, 'driver-1', WEDNESDAY);
  assert.equal(summary.today, 1000 + 2000);
  assert.equal(summary.thisWeek, 1000 + 2000 + 4000 + 8000);
  assert.equal(summary.allTime, 1000 + 2000 + 4000 + 8000 + 16000 + 32000);
  assert.equal(summary.deliveries, 6);
});

test('only this driver’s completed deliveries count', () => {
  const unfinished = must(
    startDriving(
      must(startTrip('r3', 'driver-1', totalForDriverFare(5000), totalForDriverFare(5000), local(18, 9))),
      local(18, 10),
    ),
  );
  const trips = store(
    completedTrip('r1', 'driver-1', 3000, local(18, 9)),
    completedTrip('r2', 'driver-2', 9000, local(18, 9)),
    unfinished,
  );
  const summary = driverEarnings(trips, 'driver-1', WEDNESDAY);
  assert.equal(summary.allTime, 3000);
  assert.equal(summary.deliveries, 1);
  assert.equal(earningsHistory(trips, 'driver-1').length, 1);
  assert.equal(earningsHistory(trips, 'driver-3').length, 0);
});

test('a driver with no deliveries has zero earnings and no rating', () => {
  assert.deepEqual(driverEarnings({}, 'driver-1', WEDNESDAY), {
    today: 0,
    thisWeek: 0,
    allTime: 0,
    deliveries: 0,
    ratingCount: 0,
    averageRating: undefined,
  });
});

test('the history lists the newest delivery first', () => {
  const trips = store(
    completedTrip('a', 'driver-1', 1000, local(10, 9)),
    completedTrip('c', 'driver-1', 3000, local(18, 9)),
    completedTrip('b', 'driver-1', 2000, local(14, 9)),
  );
  assert.deepEqual(
    earningsHistory(trips, 'driver-1').map((row) => row.requestId),
    ['c', 'b', 'a'],
  );
});

test('the average rating is rounded to one decimal and ignores unrated trips', () => {
  const trips = store(
    completedTrip('r1', 'driver-1', 1000, local(18, 9), { stars: 5 }),
    completedTrip('r2', 'driver-1', 1000, local(18, 10), { stars: 4 }),
    completedTrip('r3', 'driver-1', 1000, local(18, 11), { stars: 4 }),
    completedTrip('r4', 'driver-1', 1000, local(18, 12)), // not rated yet
    completedTrip('r5', 'driver-2', 1000, local(18, 12), { stars: 1 }),
  );
  const summary = driverEarnings(trips, 'driver-1', WEDNESDAY);
  assert.equal(summary.ratingCount, 3);
  assert.equal(summary.averageRating, 4.3);
});

test('a delivery’s completion time is when the customer confirmed it', () => {
  const trip = completedTrip('r1', 'driver-1', 1000, local(18, 9));
  assert.equal(completedAt(trip), local(18, 9));
  const early = must(startTrip('r2', 'driver-1', totalForDriverFare(1000), totalForDriverFare(1000), local(18, 9)));
  assert.equal(completedAt(early), undefined);
});