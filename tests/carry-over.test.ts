/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { jobStatus } from '../src/features/driver-workspace/jobs';
import {
  advanceDriver,
  declineAndAdvance,
} from '../src/features/negotiation/assignment';
import { bubbleLabel, statusCaption } from '../src/features/negotiation/chat';
import { openWithMockOffers } from '../src/features/negotiation/mockDrivers';
import {
  acceptOffer,
  isNegotiation,
  offerId,
  submitOffer,
  threadOf,
  type Negotiation,
  type Result,
} from '../src/features/negotiation/negotiation';
import type { Job } from '../src/features/negotiation/selection';

const NOW = '2026-11-11T10:00:00.000Z';
const LATER = '2026-11-11T10:05:00.000Z';
const standard: Job = { service: 'parcel', size: 'Small', urgent: false };

function must(result: Result): Negotiation {
  assert.ok(result.ok, result.ok ? '' : result.error);
  return result.negotiation;
}

const open = () => openWithMockOffers('r1', 3000, NOW, 'trip', standard);

const customerOffers = (n: Negotiation, driverId: string, amount: number) =>
  must(
    submitOffer(n, {
      id: offerId(n, driverId),
      driverId,
      by: 'customer',
      amount,
      now: NOW,
    }),
  );

const driverOffers = (n: Negotiation, driverId: string, amount: number) =>
  must(
    submitOffer(n, {
      id: offerId(n, driverId),
      driverId,
      by: 'driver',
      amount,
      now: NOW,
    }),
  );

const lastOf = (n: Negotiation, driverId: string) => {
  const thread = threadOf(n, driverId);
  return thread[thread.length - 1];
};

// The customer counters Eric at 3,100 and Eric passes on the job.
function ericPasses() {
  const n = customerOffers(open(), 'driver-1', 3100);
  return must(declineAndAdvance(n, lastOf(n, 'driver-1').id, 'driver', LATER));
}

test('the customer’s last price goes to the next driver when one passes', () => {
  const n = ericPasses();
  assert.equal(n.assignment?.current, 'driver-2');

  const thread = threadOf(n, 'driver-2');
  assert.equal(thread.length, 2);
  // Aline's own opening price is answered by the customer's offer.
  assert.equal(thread[0].by, 'driver');
  assert.equal(thread[0].status, 'countered');
  assert.equal(thread[1].by, 'customer');
  assert.equal(thread[1].amount, 3100);
  assert.equal(thread[1].status, 'pending');
  assert.equal(thread[1].carriedFrom, 'driver-1');
  assert.equal(thread[1].createdAt, LATER);
});

test('the next driver is asked to respond, and the one who passed is out', () => {
  const n = ericPasses();
  assert.equal(jobStatus(n, 'driver-2'), 'your-turn');
  assert.equal(jobStatus(n, 'driver-1'), 'passed');
  assert.equal(jobStatus(n, 'driver-3'), undefined);
});

test('the next driver can accept the carried price and the fare locks there', () => {
  const n = ericPasses();
  const carried = lastOf(n, 'driver-2');
  const locked = must(acceptOffer(n, carried.id, 'driver'));
  assert.equal(locked.lockedFare, 3100);
  assert.equal(locked.assignment?.current, 'driver-2');
  assert.ok(isNegotiation(locked));
});

test('the next driver can counter or pass, like any other offer', () => {
  const n = ericPasses();
  const countered = driverOffers(n, 'driver-2', 3500);
  assert.equal(lastOf(countered, 'driver-2').amount, 3500);
  assert.equal(lastOf(countered, 'driver-2').carriedFrom, undefined);

  const passed = must(
    declineAndAdvance(n, lastOf(n, 'driver-2').id, 'driver', LATER),
  );
  assert.equal(passed.assignment?.current, 'driver-3');
});

test('the carried price counts as one of the driver’s rounds', () => {
  const n = ericPasses();
  assert.equal(threadOf(n, 'driver-2').length, 2);
  assert.equal(n.maxRoundsPerDriver, 4);
});

test('the price keeps moving on when each driver passes', () => {
  let n = ericPasses();
  n = must(declineAndAdvance(n, lastOf(n, 'driver-2').id, 'driver', LATER));
  assert.equal(n.assignment?.current, 'driver-3');
  const carried = lastOf(n, 'driver-3');
  assert.equal(carried.amount, 3100);
  assert.equal(carried.by, 'customer');
  assert.equal(carried.carriedFrom, 'driver-2');
});

test('a new price from the customer is the one that is carried on', () => {
  let n = ericPasses();
  // Aline counters the carried 3,100, the customer replies at 3,300, and
  // Aline passes on that.
  n = driverOffers(n, 'driver-2', 3500);
  n = customerOffers(n, 'driver-2', 3300);
  n = must(declineAndAdvance(n, lastOf(n, 'driver-2').id, 'driver', LATER));
  assert.equal(n.assignment?.current, 'driver-3');
  assert.equal(lastOf(n, 'driver-3').amount, 3300);
  assert.equal(lastOf(n, 'driver-3').carriedFrom, 'driver-2');
});

test('when the customer turns down a counter, their own last price is carried', () => {
  let n = customerOffers(open(), 'driver-1', 3100);
  n = driverOffers(n, 'driver-1', 3400);
  n = must(declineAndAdvance(n, lastOf(n, 'driver-1').id, 'customer', LATER));
  assert.equal(n.assignment?.current, 'driver-2');
  // Not Eric's 3,400: the price the customer offered.
  assert.equal(lastOf(n, 'driver-2').amount, 3100);
  assert.equal(lastOf(n, 'driver-2').by, 'customer');
});

test('with no customer price yet, the next driver keeps their own opening offer', () => {
  const n = open();
  const eric = lastOf(n, 'driver-1');
  const moved = must(declineAndAdvance(n, eric.id, 'customer', LATER));
  assert.equal(moved.assignment?.current, 'driver-2');
  const thread = threadOf(moved, 'driver-2');
  assert.equal(thread.length, 1);
  assert.equal(thread[0].by, 'driver');
  assert.equal(thread[0].status, 'pending');
  assert.equal(thread[0].carriedFrom, undefined);
  assert.equal(jobStatus(moved, 'driver-2'), 'waiting');
});

test('nothing is carried when no driver is left', () => {
  let n = customerOffers(open(), 'driver-1', 3100);
  for (const id of ['driver-1', 'driver-2', 'driver-3']) {
    n = must(declineAndAdvance(n, lastOf(n, id).id, 'driver', LATER));
  }
  assert.equal(n.assignment?.current, undefined);
  assert.equal(
    n.offers.filter((o) => o.carriedFrom).length,
    2, // one to Aline, one to Jean Paul, none after the last driver passed
  );
  assert.ok(isNegotiation(n));
});

test('if the price cannot be sent, the next driver still takes over', () => {
  // With one round per driver there is no room for the customer's message.
  const tight = { ...open(), maxRoundsPerDriver: 1 };
  const n = must(
    declineAndAdvance(tight, lastOf(tight, 'driver-1').id, 'customer', LATER),
  );
  assert.equal(n.assignment?.current, 'driver-2');
  assert.equal(threadOf(n, 'driver-2').length, 1);
  assert.equal(threadOf(n, 'driver-2')[0].carriedFrom, undefined);
});

test('a locked fare or a driver still in play carries nothing', () => {
  const n = customerOffers(open(), 'driver-1', 3100);
  assert.equal(advanceDriver(n, LATER), n);

  const locked = must(
    acceptOffer(open(), lastOf(open(), 'driver-1').id, 'customer'),
  );
  assert.equal(advanceDriver(locked, LATER), locked);
});

test('the time defaults to now when none is given', () => {
  const n = customerOffers(open(), 'driver-1', 3100);
  const moved = must(declineAndAdvance(n, lastOf(n, 'driver-1').id, 'driver'));
  const carried = lastOf(moved, 'driver-2');
  assert.ok(Number.isFinite(Date.parse(carried.createdAt)));
  assert.ok(isNegotiation(moved));
});

test('carried offers survive storage, and a damaged marker is rejected', () => {
  const n = ericPasses();
  assert.ok(isNegotiation(JSON.parse(JSON.stringify(n))));
  const carried = lastOf(n, 'driver-2');
  const damage = (carriedFrom: unknown) => ({
    ...n,
    offers: n.offers.map((o) =>
      o.id === carried.id ? { ...o, carriedFrom } : o,
    ),
  });
  assert.equal(isNegotiation(damage(5)), false);
  assert.equal(isNegotiation(damage('')), false);
  assert.ok(isNegotiation(damage('driver-1')));
});

test('the chat explains a carried offer to both sides', () => {
  const n = ericPasses();
  const thread = threadOf(n, 'driver-2');
  const carried = thread[1];

  assert.equal(bubbleLabel(carried, 1, 'customer'), 'Your offer, passed on');
  assert.equal(statusCaption(carried, 'customer'), 'Sent on to this driver');
  assert.equal(bubbleLabel(carried, 1, 'driver'), 'Customer’s offer');
  assert.equal(statusCaption(carried, 'driver'), 'Open offer');

  // A normal counter-offer keeps its usual wording.
  const normal = customerOffers(open(), 'driver-1', 3100);
  const counter = lastOf(normal, 'driver-1');
  assert.equal(bubbleLabel(counter, 1, 'customer'), 'Your counter-offer');
  assert.equal(statusCaption(counter, 'customer'), 'Waiting for reply');
  assert.equal(bubbleLabel(counter, 1, 'driver'), 'Customer’s counter-offer');
});