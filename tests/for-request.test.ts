/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { DeliveryRequest } from '../src/features/delivery/model';
import {
  minimumFareForRequest,
  requestPricing,
  tripKey,
} from '../src/features/pricing/forRequest';
import { acceptOffer } from '../src/features/negotiation/negotiation';
import { openWithMockOffers } from '../src/features/negotiation/mockDrivers';

const base: DeliveryRequest = {
  id: 'r1',
  service: 'parcel',
  pickup: 'A',
  destination: 'B',
  description: 'Documents',
  method: 'pickup',
  size: 'Small',
  notes: '',
  quantities: {},
  createdAt: '2026-11-10T10:00:00.000Z',
  previewConfirmed: false,
};

// The minimum is a total: the lowest driver fare plus the service fee and tax,
// rounded up to the next 100. For parcels, 1500 + 300 + 54 = 1854, so 1900.
const BASE_MINIMUM = 1900;

test('parcel and cargo requests get a minimum total fare', () => {
  assert.equal(minimumFareForRequest(base)?.amount, BASE_MINIMUM);
  // Cargo: 8000 + 800 fee + 144 tax = 8944, so 9000.
  assert.equal(minimumFareForRequest({ ...base, service: 'cargo' })?.amount, 9000);
});

test('restaurant and shop requests are not negotiated', () => {
  assert.equal(minimumFareForRequest({ ...base, service: 'restaurant' }), null);
  assert.equal(minimumFareForRequest({ ...base, service: 'shop' }), null);
});

test('a road route raises the minimum above the floor', () => {
  const result = minimumFareForRequest({
    ...base,
    roadRoute: { distanceMeters: 5000, durationSeconds: 900, path: [] },
  });
  // A 3100 driver fare + 310 fee + 56 tax = 3466, so 3500.
  assert.equal(result?.amount, 3500);
});

const lockedAt = (minimum: number = BASE_MINIMUM) => {
  const opened = openWithMockOffers(
    'r1',
    minimum,
    base.createdAt,
    tripKey(base),
  );
  const result = acceptOffer(opened, opened.offers[0].id, 'customer');
  assert.ok(result.ok);
  return result.negotiation;
};

test('parcel pricing waits until a fare is agreed', () => {
  assert.deepEqual(requestPricing(base), { kind: 'awaiting', stale: false });

  const open = openWithMockOffers(
    'r1',
    BASE_MINIMUM,
    base.createdAt,
    tripKey(base),
  );

  assert.deepEqual(requestPricing(base, open), {
    kind: 'awaiting',
    stale: false,
  });
});

test('an agreed total is split into the driver fare, service fee and tax', () => {
  const pricing = requestPricing(base, lockedAt()); // first offer 1.1x = 2100

  assert.equal(pricing.kind, 'agreed');

  if (pricing.kind !== 'agreed') return;

  // The customer pays exactly what was agreed.
  assert.equal(pricing.total, 2100);
  assert.equal(pricing.breakdown.total, 2100);

  // 1746 + 300 (minimum fee) + 54 tax = 2100.
  assert.equal(pricing.driverFare, 1746);
  const line = (key: string) =>
    pricing.breakdown.lines.find((l) => l.key === key)?.amount;
  assert.equal(line('driverFare'), 1746);
  assert.equal(line('serviceFee'), 300);
  assert.equal(line('tax'), 54);
});

test('a fare agreed for an older trip is void after the trip changes', () => {
  const changed = {
    ...base,
    roadRoute: { distanceMeters: 5000, durationSeconds: 900, path: [] },
  };

  assert.deepEqual(requestPricing(changed, lockedAt()), {
    kind: 'awaiting',
    stale: true,
  });
});

test('restaurant and shop keep a labelled sample breakdown', () => {
  const pricing = requestPricing({ ...base, service: 'restaurant' });
  assert.equal(pricing.kind, 'sample');
});

test('a different destination voids the fare even when the minimum is the same', () => {
  const moved = { ...base, destination: 'C' };

  // Both trips sit on the same floor, so the minimum alone cannot tell them apart.
  assert.equal(minimumFareForRequest(moved)?.amount, BASE_MINIMUM);

  assert.deepEqual(requestPricing(moved, lockedAt()), {
    kind: 'awaiting',
    stale: true,
  });
});

test('notes, description and the road route do not change the trip', () => {
  const edited = { ...base, notes: 'Call me', description: 'A gift' };

  assert.equal(tripKey(edited), tripKey(base));

  assert.notEqual(
    tripKey({ ...base, size: 'Large' }),
    tripKey(base),
  );

  assert.notEqual(
    tripKey({
      ...base,
      pickupPoint: { latitude: -1.95, longitude: 30.09 },
    }),
    tripKey(base),
  );
});