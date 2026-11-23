/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { totalForDriverFare } from '../src/features/pricing/breakdown';
import {
  complete,
  confirmPickup,
  deliver,
  pickUp,
  startDriving,
  startTrip,
  tripStatuses,
  type Trip,
  type TripResult,
} from '../src/features/trips/trip';
import {
  TIP_PRESETS,
  activeTrips,
  customerActions,
  customerHeadline,
  driverStep,
  isActiveTrip,
  parseTipInput,
  pastTrips,
  starsText,
  timeline,
} from '../src/features/trips/view';

const at = (minutes: number) =>
  new Date(Date.parse('2026-11-20T10:00:00.000Z') + minutes * 60_000).toISOString();
const TOTAL = totalForDriverFare(3000);
const must = (r: TripResult): Trip => {
  assert.ok(r.ok);
  return r.trip;
};

const booked = () => must(startTrip('r1', 'driver-1', TOTAL, TOTAL, at(0)));
const onTheWay = () => must(startDriving(booked(), at(5)));
const inTransit = () => must(pickUp(onTheWay(), at(15)));
const delivered = () => must(deliver(inTransit(), 'file:///p.jpg', at(40)));
const completed = () => must(complete(delivered(), at(45)));

test('the timeline lists every step with what is done, current and still to come', () => {
  const states = (trip: Trip) => timeline(trip).map((step) => step.state);
  assert.deepEqual(states(booked()), ['current', 'upcoming', 'upcoming', 'upcoming', 'upcoming']);
  assert.deepEqual(states(inTransit()), ['done', 'done', 'current', 'upcoming', 'upcoming']);
  assert.deepEqual(states(delivered()), ['done', 'done', 'done', 'current', 'upcoming']);
  assert.deepEqual(states(completed()), ['done', 'done', 'done', 'done', 'done']);
  assert.deepEqual(
    timeline(booked()).map((step) => step.status),
    [...tripStatuses],
  );
});

test('each reached step shows when it happened, and later steps show nothing', () => {
  const steps = timeline(inTransit());
  assert.deepEqual(
    steps.map((step) => step.at),
    [at(0), at(5), at(15), undefined, undefined],
  );
  assert.equal(steps[1].label, 'Driver on the way');
});

test('the headline names the driver and says what happens next', () => {
  assert.equal(customerHeadline(booked(), 'Eric N.').title, 'Driver booked');
  assert.match(customerHeadline(booked(), 'Eric N.').detail, /Eric N\./);
  assert.match(customerHeadline(onTheWay(), 'Eric N.').detail, /pick up your parcel/);
  assert.match(customerHeadline(inTransit(), 'Eric N.').detail, /destination/);
  assert.match(customerHeadline(delivered(), 'Eric N.').detail, /confirm/i);
  assert.equal(customerHeadline(completed(), 'Eric N.').title, 'Delivery completed');
});

test('the customer only sees the buttons that apply', () => {
  const none = { confirmPickup: false, confirmDelivery: false };
  assert.deepEqual(customerActions(booked()), none);
  assert.deepEqual(customerActions(onTheWay()), none);
  assert.deepEqual(customerActions(inTransit()), { confirmPickup: true, confirmDelivery: false });
  assert.deepEqual(customerActions(delivered()), { confirmPickup: false, confirmDelivery: true });
  assert.deepEqual(customerActions(completed()), none);
});

test('the pickup button disappears once the pickup is confirmed', () => {
  const confirmed = must(confirmPickup(inTransit(), at(16)));
  assert.deepEqual(customerActions(confirmed), none());
  function none() {
    return { confirmPickup: false, confirmDelivery: false };
  }
});

test('the driver is told what to do at every stage', () => {
  const booked1 = driverStep(booked());
  assert.equal(booked1.action, 'Start driving to pickup');
  assert.equal(booked1.stop, 'pickup');
  assert.equal(driverStep(onTheWay()).action, 'Parcel picked up');
  assert.equal(driverStep(onTheWay()).stop, 'pickup');
  const transit = driverStep(inTransit());
  assert.equal(transit.action, 'Take delivery photo');
  assert.equal(transit.stop, 'destination');
  assert.match(transit.detail, /photo/);
});

test('once the parcel is delivered the driver waits and has nothing to press', () => {
  for (const trip of [delivered(), completed()]) {
    const step = driverStep(trip);
    assert.equal(step.action, undefined);
    assert.equal(step.stop, undefined);
  }
  assert.match(driverStep(delivered()).title, /Waiting for the customer/);
  assert.equal(driverStep(completed()).title, 'Delivery completed');
});

test('tips can be picked in one tap or typed in whole francs', () => {
  assert.deepEqual([...TIP_PRESETS], [500, 1000, 2000]);
  assert.equal(parseTipInput('1500'), 1500);
  assert.equal(parseTipInput(' 1,500 '), 1500);
  assert.equal(parseTipInput('2 000'), 2000);
  for (const bad of ['', '  ', 'abc', '12.5', '-300', '5e3', '1,5.0'])
    assert.equal(parseTipInput(bad), undefined, JSON.stringify(bad));
});

test('stars are shown filled up to the rating and empty after', () => {
  assert.equal(starsText(5), '★★★★★');
  assert.equal(starsText(4), '★★★★☆');
  assert.equal(starsText(1), '★☆☆☆☆');
});

test('a delivery is active until it is completed', () => {
  assert.equal(isActiveTrip(booked()), true);
  assert.equal(isActiveTrip(inTransit()), true);
  assert.equal(isActiveTrip(delivered()), true);
  assert.equal(isActiveTrip(completed()), false);
});

test('the customer’s Active and Past lists split deliveries and put the latest first', () => {
  const make = (id: string, minutes: number, finish: boolean) => {
    let t = must(startTrip(id, 'driver-1', TOTAL, TOTAL, at(minutes)));
    t = must(startDriving(t, at(minutes + 1)));
    if (!finish) return t;
    t = must(pickUp(t, at(minutes + 2)));
    t = must(deliver(t, 'p.jpg', at(minutes + 3)));
    return must(complete(t, at(minutes + 4)));
  };
  const trips = Object.fromEntries(
    [
      make('active-old', 0, false),
      make('done-old', 10, true),
      make('active-new', 100, false),
      make('done-new', 110, true),
    ].map((t) => [t.requestId, t]),
  );
  assert.deepEqual(
    activeTrips(trips).map((t) => t.requestId),
    ['active-new', 'active-old'],
  );
  assert.deepEqual(
    pastTrips(trips).map((t) => t.requestId),
    ['done-new', 'done-old'],
  );
  assert.deepEqual(activeTrips({}), []);
  assert.deepEqual(pastTrips({}), []);
});
