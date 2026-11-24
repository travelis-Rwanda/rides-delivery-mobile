/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  isDeliveryRequest,
  previewEstimate,
  selectedItems,
  validateRequest,
  type DeliveryRequest,
} from '../src/features/delivery/model';
import { getService } from '../src/features/delivery/services';
import {
  isPastShopBooking,
  nextShopTrackingStep,
  recordShopTracking,
  shopTrackingStatus,
  shopTrackingTimeline,
} from '../src/features/delivery/shopTracking';

function request(overrides: Partial<DeliveryRequest> = {}): DeliveryRequest {
  return {
    id: 'test-request',
    service: 'parcel',
    pickup: 'Origin test address',
    destination: 'Destination test address',
    description: 'Documents',
    method: 'pickup',
    size: 'Small',
    pickupContact: { name: 'Eric Test', phone: '+250788123456' },
    receiverContact: { name: 'Aline Test', phone: '+250728123456' },
    notes: '',
    quantities: {},
    createdAt: '2026-11-07T10:00:00.000Z',
    previewConfirmed: false,
    ...overrides,
  };
}

test('rejects missing addresses, same-address routes, and missing parcel descriptions', () => {
  assert.deepEqual(validateRequest(request()), {});
  assert.ok(validateRequest(request({ destination: '   ' })).destination);
  assert.ok(
    validateRequest(request({ pickup: '', method: 'collection' })).pickup,
  );
  assert.ok(
    validateRequest(request({ destination: ' ORIGIN TEST ADDRESS ' }))
      .destination,
  );
  assert.ok(validateRequest(request({ description: '' })).description);
});

test('merchant requests require selected catalogue items and preserve item quantities in totals', () => {
  const empty = request({ service: 'restaurant', description: '' });
  assert.ok(validateRequest(empty).items);
  const order = {
    ...empty,
    quantities: { chicken: 2, bowl: 1, unknownItem: 10 },
  };
  assert.deepEqual(validateRequest(order), {});
  assert.equal(selectedItems(order).length, 2);
  assert.equal(previewEstimate(order).subtotal, 17500);
  assert.equal(previewEstimate(order).total, 19500);
});

test('driver fare and platform fee stay separate across parcel sizes and cargo previews', () => {
  const parcel = previewEstimate(request({ size: 'Large' }));
  assert.equal(parcel.subtotal, 0);
  assert.equal(parcel.transport, 3000);
  assert.equal(parcel.serviceFee, 500);
  assert.equal(parcel.total, 3500);
  const cargo = previewEstimate(request({ service: 'cargo' }));
  assert.equal(cargo.total, cargo.transport + cargo.serviceFee);
  assert.equal(cargo.transport, 12000);
});

test('stored requests reject corrupt data, invalid services, and unsafe quantities', () => {
  assert.ok(isDeliveryRequest(JSON.parse(JSON.stringify(request()))));
  for (const invalid of [
    null,
    {},
    request({ service: 'unknown' as DeliveryRequest['service'] }),
    request({ createdAt: 'not-a-date' }),
    request({ quantities: { chicken: -1 } }),
    request({ quantities: { chicken: 1.5 } }),
    request({ quantities: { chicken: Number.MAX_SAFE_INTEGER + 1 } }),
    { ...request(), previewConfirmed: 'true' },
  ])
    assert.equal(isDeliveryRequest(invalid), false);
  assert.equal(getService(['parcel']), undefined);
  assert.equal(getService('invalid'), undefined);
});

test('saved parcel requests support receiving and older requests without a direction', () => {
  const received = request({ parcelDirection: 'receive' });
  assert.ok(isDeliveryRequest(JSON.parse(JSON.stringify(received))));
  assert.ok(isDeliveryRequest(request()));
  assert.equal(
    isDeliveryRequest({ ...received, parcelDirection: 'other' }),
    false,
  );
  assert.equal(isDeliveryRequest({ ...received, service: 'cargo' }), false);
});

test('shop bookings round-trip as parcel requests with an explicit role', () => {
  for (const direction of ['send', 'receive'] as const) {
    const booking = request({
      bookingSource: 'shop',
      parcelDirection: direction,
    });
    assert.ok(isDeliveryRequest(JSON.parse(JSON.stringify(booking))));
    assert.equal(
      isDeliveryRequest({ ...booking, parcelDirection: undefined }),
      false,
    );
    assert.equal(isDeliveryRequest({ ...booking, bookingSource: 'other' }), false);
  }
  assert.equal(
    isDeliveryRequest(request({ service: 'shop', bookingSource: 'shop' })),
    false,
  );
});

test('confirmed shop bookings track delivery in order and retain timestamps', () => {
  let booking = request({
    bookingSource: 'shop',
    parcelDirection: 'receive',
    previewConfirmed: true,
  });
  assert.equal(shopTrackingStatus(booking), 'awaiting-pickup');
  assert.throws(() => recordShopTracking(booking, 'delivered'));
  for (const status of [
    'on-the-way',
    'in-transit',
    'delivered',
    'completed',
  ] as const) {
    assert.equal(isPastShopBooking(booking), false);
    assert.equal(nextShopTrackingStep(booking)?.status, status);
    booking = recordShopTracking(booking, status);
    assert.equal(shopTrackingStatus(booking), status);
    assert.ok(isDeliveryRequest(JSON.parse(JSON.stringify(booking))));
    assert.throws(() => recordShopTracking(booking, status));
    assert.throws(() => recordShopTracking(booking, 'cancelled'));
  }
  assert.equal(isPastShopBooking(booking), true);
  assert.equal(nextShopTrackingStep(booking), undefined);
  assert.ok(shopTrackingTimeline(booking).every((step) => step.reached));
  assert.deepEqual(
    shopTrackingTimeline(booking)
      .slice(2)
      .map(({ status, at }) => ({ status, at })),
    booking.shopTracking,
  );
});

test('cancelled shop bookings retain their details and previously reached steps', () => {
  for (const confirmed of [false, true]) {
    const booking = request({
      bookingSource: 'shop',
      parcelDirection: 'send',
      previewConfirmed: confirmed,
    });
    const archived = recordShopTracking(booking, 'cancelled');
    assert.ok(isDeliveryRequest(JSON.parse(JSON.stringify(archived))));
    assert.equal(archived.description, booking.description);
    assert.equal(isPastShopBooking(archived), true);
    assert.equal(nextShopTrackingStep(archived), undefined);
    assert.deepEqual(
      shopTrackingTimeline(archived).map((step) => step.status),
      confirmed
        ? ['draft', 'awaiting-pickup', 'cancelled']
        : ['draft', 'cancelled'],
    );
    assert.throws(() => recordShopTracking(archived, 'on-the-way'));
  }
});

test('tracking cannot attach to personal requests or skip a step in storage', () => {
  const personal = request({ previewConfirmed: true });
  const booking = {
    ...personal,
    bookingSource: 'shop',
    parcelDirection: 'receive',
  };
  const at = '2026-11-07T11:00:00.000Z';
  assert.throws(() => recordShopTracking(personal, 'on-the-way'));
  for (const invalid of [
    { ...personal, shopTracking: [{ status: 'on-the-way', at }] },
    { ...booking, shopTracking: [{ status: 'in-transit', at }] },
    { ...booking, shopTracking: [{ status: 'on-the-way', at: null }] },
  ]) {
    assert.equal(isDeliveryRequest(invalid), false);
  }
});

test('a saved road route requires two valid stops and survives a storage round trip', () => {
  const pickupPoint = { latitude: -1.9547, longitude: 30.0947 };
  const destinationPoint = { latitude: -1.9358, longitude: 30.0846 };
  const mapped = request({
    pickup: 'Dropped pin',
    destination: 'Dropped pin',
    pickupPoint,
    destinationPoint,
    roadRoute: {
      distanceMeters: 3000,
      durationSeconds: 360,
      path: [pickupPoint, destinationPoint],
    },
  });
  assert.ok(isDeliveryRequest(JSON.parse(JSON.stringify(mapped))));
  assert.deepEqual(validateRequest(mapped), {});
  assert.ok(
    validateRequest({ ...mapped, destinationPoint: pickupPoint }).destination,
  );
  assert.equal(
    isDeliveryRequest({ ...mapped, destinationPoint: undefined }),
    false,
  );
});
