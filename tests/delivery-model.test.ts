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

function request(overrides: Partial<DeliveryRequest> = {}): DeliveryRequest {
  return {
    id: 'test-request',
    service: 'parcel',
    pickup: 'Origin test address',
    destination: 'Destination test address',
    description: 'Documents',
    method: 'pickup',
    size: 'Small',
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
    request({ quantities: { chicken: 21 } }),
    { ...request(), previewConfirmed: 'true' },
  ])
    assert.equal(isDeliveryRequest(invalid), false);
  assert.equal(getService(['parcel']), undefined);
  assert.equal(getService('invalid'), undefined);
});
