
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

test('parcel and cargo requests get a minimum fare', () => {
  assert.equal(minimumFareForRequest(base)?.amount, 1500);
  assert.equal(minimumFareForRequest({ ...base, service: 'cargo' })?.amount, 8000);
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
  assert.equal(result?.amount, 3100);
});

const lockedAt = (minimum: number) => {
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
    1500,
    base.createdAt,
    tripKey(base),
  );

  assert.deepEqual(requestPricing(base, open), {
    kind: 'awaiting',
    stale: false,
  });
});

test('an agreed fare produces a full breakdown with the fare untouched', () => {
  const pricing = requestPricing(base, lockedAt(1500)); // first offer 1.1x = 1700

  assert.equal(pricing.kind, 'agreed');

  if (pricing.kind !== 'agreed') return;

  assert.equal(pricing.driverFare, 1700);
  assert.equal(
    pricing.breakdown.lines.find((l) => l.key === 'driverFare')?.amount,
    1700,
  );

  // fee 300 (minimum), tax 54
  assert.equal(pricing.breakdown.total, 1700 + 300 + 54);
});

test('a fare agreed for an older trip is void after the trip changes', () => {
  const changed = {
    ...base,
    roadRoute: { distanceMeters: 5000, durationSeconds: 900, path: [] },
  };

  assert.deepEqual(requestPricing(changed, lockedAt(1500)), {
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

  // Both trips sit on the 1500 floor, so the minimum alone cannot tell them apart.
  assert.equal(minimumFareForRequest(moved)?.amount, 1500);

  assert.deepEqual(requestPricing(moved, lockedAt(1500)), {
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
