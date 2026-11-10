/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  acceptOffer,
  isNegotiation,
  submitOffer,
  type Negotiation,
} from '../src/features/negotiation/negotiation';
import {
  mockDriverReply,
  mockDrivers,
  openWithMockOffers,
} from '../src/features/negotiation/mockDrivers';

const NOW = '2026-11-10T10:00:00.000Z';

function counter(n: Negotiation, driverId: string, amount: number) {
  const result = submitOffer(n, { id: 'c1', driverId, by: 'customer', amount, now: NOW });
  assert.ok(result.ok);
  return result.negotiation;
}

test('mock drivers open with offers above the minimum fare', () => {
  const n = openWithMockOffers('r1', 3000, NOW);
  assert.deepEqual(n.offers.map((o) => o.amount), [3300, 3800, 4200]);
  assert.equal(n.offers.length, mockDrivers.length);
  assert.ok(n.offers.every((o) => o.status === 'pending' && o.amount >= n.minimumFare));
});

test('saved negotiations survive a storage round trip and reject corruption', () => {
  const n = openWithMockOffers('r1', 3000, NOW);
  assert.ok(isNegotiation(JSON.parse(JSON.stringify(n))));
  assert.equal(isNegotiation({ ...n, offers: [{ ...n.offers[0], amount: -5 }] }), false);
  assert.equal(isNegotiation({ ...n, status: 'locked' }), false);
  assert.equal(isNegotiation(null), false);

  const locked = acceptOffer(n, n.offers[0].id, 'customer');
  assert.ok(locked.ok);
  assert.ok(isNegotiation(locked.negotiation));
  assert.equal(isNegotiation({ ...locked.negotiation, lockedFare: 1 }), false);
});

test('a mocked driver accepts a counter within 10% of their ask', () => {
  const n = counter(openWithMockOffers('r1', 3000, NOW), 'driver-1', 3100);
  const reply = mockDriverReply(n, 'driver-1', NOW);
  assert.ok(reply.ok);
  assert.equal(reply.negotiation.lockedFare, 3100);
});

test('a mocked driver meets in the middle on a low counter', () => {
  const n = counter(openWithMockOffers('r1', 3000, NOW), 'driver-3', 3000);
  const reply = mockDriverReply(n, 'driver-3', NOW);
  assert.ok(reply.ok);
  assert.equal(reply.negotiation.status, 'open');
  const thread = reply.negotiation.offers.filter((o) => o.driverId === 'driver-3');
  const last = thread[thread.length - 1];
  assert.equal(last.amount, 3600);
  assert.equal(last.by, 'driver');
});

test('a mocked driver has nothing to answer before the customer counters', () => {
  assert.equal(mockDriverReply(openWithMockOffers('r1', 3000, NOW), 'driver-1', NOW).ok, false);
});