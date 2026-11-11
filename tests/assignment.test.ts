/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { kigaliPlaces } from '../src/features/maps/places';
import {
  advanceDriver,
  declineAndAdvance,
  driverFailed,
  openingAsks,
  matchSummary,
} from '../src/features/negotiation/assignment';
import { openWithMockOffers } from '../src/features/negotiation/mockDrivers';
import {
  acceptOffer,
  isNegotiation,
  offerId,
  submitOffer,
  type Negotiation,
} from '../src/features/negotiation/negotiation';
import type { Job } from '../src/features/negotiation/selection';

const NOW = '2026-11-11T10:00:00.000Z';
const standard: Job = { service: 'parcel', size: 'Small', urgent: false };
const urgentAtNyamirambo: Job = {
  service: 'parcel',
  size: 'Small',
  urgent: true,
  pickup: kigaliPlaces.nyamirambo,
};

const open = (job?: Job) => openWithMockOffers('r1', 3000, NOW, 'trip', job);

function must(result: ReturnType<typeof acceptOffer>): Negotiation {
  assert.ok(result.ok, result.ok ? '' : result.error);
  return result.negotiation;
}

const counter = (n: Negotiation, driverId: string, amount: number) =>
  submitOffer(n, {
    id: offerId(n, driverId),
    driverId,
    by: 'customer',
    amount,
    now: NOW,
  });

test('without a job every driver stays open, as before', () => {
  const n = open();
  assert.equal(n.assignment, undefined);
  assert.equal(n.offers.length, 3);
});

test('a standard delivery is matched to the cheapest driver', () => {
  const n = open(standard);
  assert.equal(n.assignment?.current, 'driver-1');
  assert.equal(n.assignment?.basis, 'cheapest');
  assert.deepEqual(n.assignment?.order, ['driver-1', 'driver-2', 'driver-3']);
  assert.deepEqual(n.assignment?.tried, []);
});

test('an urgent delivery is matched to the driver nearest the pickup', () => {
  const n = open(urgentAtNyamirambo);
  assert.equal(n.assignment?.current, 'driver-3');
  assert.equal(n.assignment?.basis, 'nearest');
  assert.equal(n.assignment?.order.length, 3);
});

test('an urgent delivery with no pinned pickup falls back and says so', () => {
  const n = open({ ...urgentAtNyamirambo, pickup: undefined });
  assert.equal(n.assignment?.current, 'driver-1');
  assert.equal(n.assignment?.fellBack, true);
});

test('drivers whose vehicle cannot carry the job never make an offer', () => {
  const n = open({ service: 'cargo', size: 'Small', urgent: false });
  assert.deepEqual(Object.keys(openingAsks(n)), ['driver-3']);
  assert.deepEqual(n.assignment?.order, ['driver-3']);
});

test('only the matched driver can offer, counter or be accepted', () => {
  const n = open(standard);
  // Eric is matched. Aline made a standby offer but is not in play.
  assert.equal(counter(n, 'driver-2', 3500).ok, false);
  const standby = n.offers.find((o) => o.driverId === 'driver-2')!;
  assert.equal(acceptOffer(n, standby.id, 'customer').ok, false);
  const live = n.offers.find((o) => o.driverId === 'driver-1')!;
  assert.ok(acceptOffer(n, live.id, 'customer').ok);
});

test('accepting locks the fare with the matched driver', () => {
  const n = open(standard);
  const live = n.offers.find((o) => o.driverId === 'driver-1')!;
  const locked = must(acceptOffer(n, live.id, 'customer'));
  assert.equal(locked.lockedFare, 3300);
  assert.equal(locked.assignment?.current, 'driver-1');
  assert.ok(isNegotiation(locked));
});

test('declining the matched driver moves to the next best, who is already in play', () => {
  const n = open(standard);
  const live = n.offers.find((o) => o.driverId === 'driver-1')!;
  const next = must(declineAndAdvance(n, live.id, 'customer'));
  assert.equal(next.assignment?.current, 'driver-2');
  assert.deepEqual(next.assignment?.tried, ['driver-1']);
  // Aline's opening offer is now the live one and can be accepted.
  const alines = next.offers.find((o) => o.driverId === 'driver-2')!;
  const locked = must(acceptOffer(next, alines.id, 'customer'));
  assert.equal(locked.lockedFare, 3800);
});

test('a driver walking away hands the delivery to the next best', () => {
  let n = open(standard);
  n = must(counter(n, 'driver-1', 3100));
  const countered = n.offers.find((o) => o.id === 'r1:driver-1:2')!;
  n = must(declineAndAdvance(n, countered.id, 'driver'));
  assert.equal(n.assignment?.current, 'driver-2');
});

test('declining when the rounds have run out also moves on', () => {
  let n = open(standard);
  // Eric offers (round 1), then the customer and Eric trade up to the limit.
  n = must(counter(n, 'driver-1', 3000));
  n = must(
    submitOffer(n, { id: 'a', driverId: 'driver-1', by: 'driver', amount: 3200, now: NOW }),
  );
  n = must(counter(n, 'driver-1', 3100));
  assert.equal(
    submitOffer(n, { id: 'b', driverId: 'driver-1', by: 'driver', amount: 3150, now: NOW }).ok,
    false,
  ); // limit reached
  const last = n.offers[n.offers.length - 1];
  n = must(declineAndAdvance(n, last.id, 'driver'));
  assert.equal(n.assignment?.current, 'driver-2');
});

test('when every driver has been tried nobody is matched and nothing locks', () => {
  let n = open(standard);
  for (const id of ['driver-1', 'driver-2', 'driver-3']) {
    const live = n.offers.find((o) => o.driverId === id && o.status === 'pending')!;
    n = must(declineAndAdvance(n, live.id, 'customer'));
  }
  assert.equal(n.assignment?.current, undefined);
  assert.deepEqual(n.assignment?.tried, ['driver-1', 'driver-2', 'driver-3']);
  assert.equal(n.status, 'open');
  assert.equal(counter(n, 'driver-1', 3500).ok, false);
  assert.ok(isNegotiation(n));
});

test('advancing does nothing while the matched driver is still in play', () => {
  const n = open(standard);
  assert.equal(advanceDriver(n), n);
  const countered = must(counter(n, 'driver-1', 3100));
  assert.equal(advanceDriver(countered), countered);
  assert.equal(driverFailed(countered, 'driver-1'), false);
  const noAssignment = open();
  assert.equal(advanceDriver(noAssignment), noAssignment);
});

test('a locked fare is never moved to another driver', () => {
  const n = open(standard);
  const live = n.offers.find((o) => o.driverId === 'driver-1')!;
  const locked = must(acceptOffer(n, live.id, 'customer'));
  assert.equal(advanceDriver(locked), locked);
});

test('saved negotiations with an assignment survive storage and reject tampering', () => {
  const n = open(standard);
  assert.ok(isNegotiation(JSON.parse(JSON.stringify(n))));
  const a = n.assignment!;
  assert.equal(isNegotiation({ ...n, assignment: { ...a, current: 'driver-9' } }), false);
  assert.equal(isNegotiation({ ...n, assignment: { ...a, basis: 'fastest' } }), false);
  assert.equal(isNegotiation({ ...n, assignment: { ...a, tried: ['driver-1'] } }), false);

  // A locked fare must belong to the matched driver.
  const live = n.offers.find((o) => o.driverId === 'driver-1')!;
  const locked = must(acceptOffer(n, live.id, 'customer'));
  assert.equal(
    isNegotiation({ ...locked, assignment: { ...locked.assignment!, current: 'driver-2' } }),
    false,
  );
});

test('the match summary tells the customer why this driver was chosen', () => {
  const base = {
    order: ['driver-1'],
    basis: 'nearest' as const,
    fellBack: false,
    current: 'driver-1',
    tried: [],
  };
  assert.equal(
    matchSummary(base, 1.234),
    'Nearest to your pickup, about 1.2 km away',
  );
  assert.equal(matchSummary(base, null), 'Nearest to your pickup');
  assert.equal(
    matchSummary({ ...base, basis: 'cheapest' }, 3),
    'Lowest price available',
  );
  assert.match(
    matchSummary({ ...base, basis: 'cheapest', fellBack: true }, null),
    /isn’t pinned on the map/,
  );
});