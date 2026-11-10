/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { minimumFare, roundUp } from '../src/features/pricing/minimumFare';

const route = (meters: number, seconds: number) => ({
  distanceMeters: meters,
  durationSeconds: seconds,
  path: [],
});

test('uses road distance and duration when a route exists', () => {
  // 1000 + 5 km * 350 + 15 min * 20 = 3050 -> rounded up to 3100
  const result = minimumFare({
    service: 'parcel',
    size: 'Small',
    roadRoute: route(5000, 900),
  });
  assert.equal(result.amount, 3100);
  assert.equal(result.distanceSource, 'road');
});

test('never goes below the minimum fare', () => {
  const result = minimumFare({
    service: 'parcel',
    size: 'Small',
    roadRoute: route(100, 60),
  });
  assert.equal(result.amount, 1500);
});

test('estimates from the two pins when there is no road route', () => {
  const result = minimumFare({
    service: 'parcel',
    size: 'Small',
    pickupPoint: { latitude: -1.9528, longitude: 30.0898 },
    destinationPoint: { latitude: -1.9567, longitude: 30.1194 },
  });
  assert.equal(result.distanceSource, 'estimated');
  assert.ok(result.amount >= 1500);
});

test('falls back to the floor when no distance is known', () => {
  const result = minimumFare({ service: 'cargo', size: 'Large' });
  assert.equal(result.amount, 8000);
  assert.equal(result.distanceSource, 'unknown');
});

test('roundUp ignores floating point noise', () => {
  assert.equal(roundUp(3000 * 1.1, 100), 3300);
  assert.equal(roundUp(3301, 100), 3400);
  assert.equal(roundUp(3300, 100), 3300);
});