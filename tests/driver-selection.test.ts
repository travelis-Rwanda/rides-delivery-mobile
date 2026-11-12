/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  isDeliveryRequest,
  type DeliveryRequest,
} from '../src/features/delivery/model';
import { kigaliPlaces } from '../src/features/maps/places';
import { mockDrivers } from '../src/features/negotiation/mockDrivers';
import {
  nextBestDriver,
  rankDrivers,
  vehicleFits,
  type Driver,
} from '../src/features/negotiation/selection';
import { tripKey } from '../src/features/pricing/forRequest';

// Eric (moto, Kimironko) is cheapest. Jean Paul (hilux, Nyamirambo) asks the
// most. These are the mock drivers' opening offers on a 3,000 RWF minimum.
const asks = { 'driver-1': 3300, 'driver-2': 3800, 'driver-3': 4200 };
const job = { service: 'parcel', size: 'Small' } as const;
const ids = (choice: ReturnType<typeof rankDrivers>) =>
  choice.ranked.map((entry) => entry.driver.id);

test('a standard delivery goes to the cheapest driver', () => {
  const choice = rankDrivers({
    ...job,
    urgent: false,
    pickup: kigaliPlaces.nyamirambo,
    drivers: mockDrivers,
    asks,
  });
  assert.deepEqual(ids(choice), ['driver-1', 'driver-2', 'driver-3']);
  assert.equal(choice.basis, 'cheapest');
  assert.equal(choice.fellBack, false);
});

test('an urgent delivery goes to the driver nearest the pickup', () => {
  const choice = rankDrivers({
    ...job,
    urgent: true,
    pickup: kigaliPlaces.nyamirambo,
    drivers: mockDrivers,
    asks,
  });
  // Jean Paul is in Nyamirambo, even though he asks the highest price.
  assert.equal(choice.ranked[0].driver.id, 'driver-3');
  assert.equal(choice.basis, 'nearest');
  assert.ok(choice.ranked[0].distanceKm! < choice.ranked[1].distanceKm!);
  assert.ok(choice.ranked[1].distanceKm! <= choice.ranked[2].distanceKm!);
});

test('an urgent delivery with no pinned pickup falls back to the cheapest driver', () => {
  const choice = rankDrivers({
    ...job,
    urgent: true,
    drivers: mockDrivers,
    asks,
  });
  assert.equal(choice.ranked[0].driver.id, 'driver-1');
  assert.equal(choice.basis, 'cheapest');
  assert.equal(choice.fellBack, true);
  assert.equal(choice.ranked[0].distanceKm, null);
});

test('a standard delivery with no pinned pickup is not a fallback', () => {
  const choice = rankDrivers({
    ...job,
    urgent: false,
    drivers: mockDrivers,
    asks,
  });
  assert.equal(choice.fellBack, false);
});

test('drivers whose vehicle cannot carry the job are never chosen', () => {
  const cargo = rankDrivers({
    service: 'cargo',
    size: 'Small',
    urgent: false,
    pickup: kigaliPlaces.kimironko,
    drivers: mockDrivers,
    asks,
  });
  assert.deepEqual(ids(cargo), ['driver-3']);

  const large = rankDrivers({
    service: 'parcel',
    size: 'Large',
    urgent: true,
    pickup: kigaliPlaces.kimironko,
    drivers: mockDrivers,
    asks,
  });
  assert.ok(!ids(large).includes('driver-1'));

  // A medium parcel suggests a cab, so a motorbike can no longer take it.
  assert.equal(
    vehicleFits('moto', { service: 'parcel', size: 'Medium' }),
    false,
  );
  assert.equal(vehicleFits('cab', { service: 'parcel', size: 'Medium' }), true);
  assert.equal(
    vehicleFits('moto', { service: 'parcel', size: 'Large' }),
    false,
  );
  assert.equal(vehicleFits('cab', { service: 'parcel', size: 'Large' }), false);
  assert.equal(vehicleFits('cab', { service: 'cargo', size: 'Small' }), false);
});

test('drivers who have not made an offer are not considered', () => {
  const choice = rankDrivers({
    ...job,
    urgent: false,
    drivers: mockDrivers,
    asks: { 'driver-2': 3800 },
  });
  assert.deepEqual(ids(choice), ['driver-2']);
  assert.deepEqual(
    rankDrivers({ ...job, urgent: false, drivers: mockDrivers, asks: {} })
      .ranked,
    [],
  );
});

test('ties are broken by the other measure, then by driver id', () => {
  const at = (id: string, latitude: number): Driver => ({
    id,
    name: id,
    vehicle: 'Cab Taxi',
    kind: 'cab',
    location: { latitude, longitude: 30.1 },
  });
  const pickup = { latitude: -1.95, longitude: 30.1 };
  const drivers = [at('b', -1.96), at('a', -1.97), at('c', -1.951)];

  // Same price: the nearest wins even on a standard delivery.
  const samePrice = rankDrivers({
    ...job,
    urgent: false,
    pickup,
    drivers,
    asks: { a: 3000, b: 3000, c: 3000 },
  });
  assert.deepEqual(ids(samePrice), ['c', 'b', 'a']);

  // Same distance: the cheaper wins on an urgent delivery.
  const sameSpot = [at('x', -1.96), at('y', -1.96)];
  const urgent = rankDrivers({
    ...job,
    urgent: true,
    pickup,
    drivers: sameSpot,
    asks: { x: 3500, y: 3200 },
  });
  assert.deepEqual(ids(urgent), ['y', 'x']);

  // Everything equal: the order is still the same every time.
  const equal = rankDrivers({
    ...job,
    urgent: true,
    pickup,
    drivers: sameSpot,
    asks: { x: 3000, y: 3000 },
  });
  assert.deepEqual(ids(equal), ['x', 'y']);
});

test('the next best driver skips drivers already tried', () => {
  const choice = rankDrivers({
    ...job,
    urgent: false,
    pickup: kigaliPlaces.kimironko,
    drivers: mockDrivers,
    asks,
  });
  assert.equal(nextBestDriver(choice, [])?.driver.id, 'driver-1');
  assert.equal(nextBestDriver(choice, ['driver-1'])?.driver.id, 'driver-2');
  assert.equal(
    nextBestDriver(choice, ['driver-1', 'driver-2', 'driver-3']),
    undefined,
  );
});

const request: DeliveryRequest = {
  id: 'r1',
  service: 'parcel',
  pickup: 'Kimironko Market',
  destination: 'Kicukiro Centre',
  description: 'Documents',
  method: 'pickup',
  size: 'Small',
  notes: '',
  quantities: {},
  createdAt: '2026-11-11T10:00:00.000Z',
  previewConfirmed: false,
};

test('requests accept an urgent flag and still load without one', () => {
  assert.ok(isDeliveryRequest(request));
  assert.ok(isDeliveryRequest({ ...request, urgent: true }));
  assert.ok(isDeliveryRequest({ ...request, urgent: false }));
  assert.equal(isDeliveryRequest({ ...request, urgent: 'yes' }), false);
});

test('urgency changes the trip key, and standard requests keep their old key', () => {
  const standard = tripKey(request);
  assert.equal(tripKey({ ...request, urgent: false }), standard);
  assert.ok(!standard.includes('urgent'));
  assert.notEqual(tripKey({ ...request, urgent: true }), standard);
});

test('every mock driver has a position and a vehicle that can carry something', () => {
  for (const driver of mockDrivers) {
    assert.ok(Number.isFinite(driver.location.latitude), driver.id);
    assert.ok(Number.isFinite(driver.location.longitude), driver.id);
    assert.ok(vehicleFits(driver.kind, { service: 'parcel', size: 'Small' }));
  }
});