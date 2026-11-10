/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  acceptOffer,
  declineOffer,
  startNegotiation,
  submitOffer,
  type Negotiation,
  type Result,
} from '../src/features/negotiation/negotiation';

const NOW = '2026-11-10T10:00:00.000Z';

function must(result: Result): Negotiation {
  assert.ok(result.ok, result.ok ? '' : result.error);
  return result.negotiation;
}

const driverOffer = (n: Negotiation, id: string, amount: number, driverId = 'd1') =>
  submitOffer(n, { id, driverId, by: 'driver', amount, now: NOW });
const customerCounter = (n: Negotiation, id: string, amount: number, driverId = 'd1') =>
  submitOffer(n, { id, driverId, by: 'customer', amount, now: NOW });

test('an offer below the minimum fare is rejected', () => {
  const n = startNegotiation('r1', 3000);
  const result = driverOffer(n, 'o1', 2900);
  assert.equal(result.ok, false);
});

test('the customer cannot open a thread, and cannot counter twice in a row', () => {
  const n = startNegotiation('r1', 3000);
  assert.equal(customerCounter(n, 'o1', 3500).ok, false);
  const n2 = must(driverOffer(n, 'o1', 5000));
  const n3 = must(customerCounter(n2, 'o2', 4000));
  assert.equal(customerCounter(n3, 'o3', 4200).ok, false);
});

test('accepting a driver offer locks the fare at that exact amount', () => {
  const n = must(driverOffer(startNegotiation('r1', 3000), 'o1', 5000));
  const locked = must(acceptOffer(n, 'o1', 'customer'));
  assert.equal(locked.status, 'locked');
  assert.equal(locked.lockedFare, 5000);
  assert.equal(locked.lockedOfferId, 'o1');
});

test('a counter-offer replaces the driver offer and the driver can accept it', () => {
  let n = must(driverOffer(startNegotiation('r1', 3000), 'o1', 5000));
  n = must(customerCounter(n, 'o2', 4000));
  assert.equal(n.offers[0].status, 'countered');
  n = must(acceptOffer(n, 'o2', 'driver'));
  assert.equal(n.lockedFare, 4000);
});

test('you cannot accept your own offer', () => {
  const n = must(driverOffer(startNegotiation('r1', 3000), 'o1', 5000));
  assert.equal(acceptOffer(n, 'o1', 'driver').ok, false);
});

test('once locked, nothing can change the fare and other offers are closed', () => {
  let n = startNegotiation('r1', 3000);
  n = must(driverOffer(n, 'o1', 5000, 'd1'));
  n = must(driverOffer(n, 'o2', 4500, 'd2'));
  n = must(acceptOffer(n, 'o2', 'customer'));
  assert.equal(n.lockedFare, 4500);
  assert.equal(n.offers[0].status, 'declined');
  assert.equal(driverOffer(n, 'o3', 3200, 'd3').ok, false);
  assert.equal(acceptOffer(n, 'o1', 'customer').ok, false);
});

test('declining closes only that offer', () => {
  let n = startNegotiation('r1', 3000);
  n = must(driverOffer(n, 'o1', 5000, 'd1'));
  n = must(driverOffer(n, 'o2', 4500, 'd2'));
  n = must(declineOffer(n, 'o1', 'customer'));
  assert.equal(n.offers[0].status, 'declined');
  assert.equal(n.offers[1].status, 'pending');
  assert.equal(n.status, 'open');
});

test('the round limit stops endless haggling', () => {
  let n = startNegotiation('r1', 3000, 2);
  n = must(driverOffer(n, 'o1', 5000));
  n = must(customerCounter(n, 'o2', 4000));
  assert.equal(driverOffer(n, 'o3', 4500).ok, false);
});