/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  isDeliveryRequest,
  type DeliveryRequest,
} from '../src/features/delivery/model';
import { openWithMockOffers } from '../src/features/negotiation/mockDrivers';
import { acceptOffer } from '../src/features/negotiation/negotiation';
import {
  suggestedVehicle,
  vehicleFits,
  vehicleLabels,
} from '../src/features/negotiation/selection';
import { breakdownForTotal } from '../src/features/pricing/breakdown';
import { requestPricing, tripKey } from '../src/features/pricing/forRequest';
import {
  addPackaging,
  packagingConfig,
  packagingFee,
} from '../src/features/pricing/packaging';

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

const agreed = (request: DeliveryRequest) => {
  const opened = openWithMockOffers('r1', 1900, base.createdAt, tripKey(base));
  const locked = acceptOffer(opened, opened.offers[0].id, 'customer');
  assert.ok(locked.ok);
  return requestPricing(request, locked.negotiation);
};

test('a vehicle is suggested from the size of the item', () => {
  assert.equal(suggestedVehicle({ service: 'parcel', size: 'Small' }), 'moto');
  assert.equal(suggestedVehicle({ service: 'parcel', size: 'Medium' }), 'cab');
  assert.equal(suggestedVehicle({ service: 'parcel', size: 'Large' }), 'hilux');
  // Cargo always needs a pickup truck, whatever the size.
  for (const size of ['Small', 'Medium', 'Large'] as const)
    assert.equal(suggestedVehicle({ service: 'cargo', size }), 'hilux');
  assert.equal(
    vehicleLabels[suggestedVehicle({ service: 'parcel', size: 'Medium' })],
    'Cab Taxi',
  );
});

test('a bigger vehicle can always take a smaller job, never the other way round', () => {
  for (const size of ['Small', 'Medium', 'Large'] as const) {
    const job = { service: 'parcel', size } as const;
    assert.equal(vehicleFits(suggestedVehicle(job), job), true);
    assert.equal(vehicleFits('hilux', job), true);
  }
  assert.equal(vehicleFits('moto', { service: 'parcel', size: 'Small' }), true);
  assert.equal(vehicleFits('cab', { service: 'parcel', size: 'Small' }), true);
  assert.equal(
    vehicleFits('moto', { service: 'parcel', size: 'Medium' }),
    false,
  );
});

test('the packaging fee depends on the size', () => {
  assert.equal(packagingFee('Small'), 500);
  assert.equal(packagingFee('Medium'), 1000);
  assert.equal(packagingFee('Large'), 2000);
});

test('packaging adds its own line and its tax, and leaves the rest alone', () => {
  const split = breakdownForTotal(2100)!;
  const withPackaging = addPackaging(split, 'Small');
  const line = (key: string) =>
    withPackaging.lines.find((l) => l.key === key)?.amount;

  // 500 packaging, and 18% tax on it = 90, on top of the tax already there.
  assert.equal(line('packaging'), 500);
  assert.equal(line('tax'), 54 + 90);
  assert.equal(line('driverFare'), 1746);
  assert.equal(line('serviceFee'), 300);
  assert.equal(withPackaging.total, 2100 + 500 + 90);
  assert.equal(
    withPackaging.lines.reduce((sum, l) => sum + l.amount, 0),
    withPackaging.total,
  );
  // The packaging line sits just before tax.
  assert.deepEqual(
    withPackaging.lines.map((l) => l.key),
    ['driverFare', 'serviceFee', 'packaging', 'tax'],
  );
});

test('packaging can be configured as untaxed', () => {
  const split = breakdownForTotal(2100)!;
  const untaxed = addPackaging(split, 'Small', {
    ...packagingConfig,
    taxed: false,
  });
  assert.equal(untaxed.total, 2100 + 500);
  assert.equal(untaxed.lines.find((l) => l.key === 'tax')?.amount, 54);
});

test('an agreed fare includes packaging only when the customer asked for it', () => {
  const without = agreed(base);
  const withIt = agreed({ ...base, packaging: true });
  assert.equal(without.kind, 'agreed');
  assert.equal(withIt.kind, 'agreed');
  if (without.kind !== 'agreed' || withIt.kind !== 'agreed') return;

  assert.equal(without.total, 2100);
  assert.ok(!without.breakdown.lines.some((l) => l.key === 'packaging'));

  // The negotiated price and the driver's share do not change.
  assert.equal(withIt.negotiated, 2100);
  assert.equal(withIt.driverFare, without.driverFare);
  assert.equal(withIt.total, 2100 + 500 + 90);
  assert.equal(withIt.breakdown.total, withIt.total);
});

test('choosing packaging does not reset a negotiation', () => {
  assert.equal(tripKey({ ...base, packaging: true }), tripKey(base));
});

test('requests accept a packaging flag and still load without one', () => {
  assert.ok(isDeliveryRequest(base));
  assert.ok(isDeliveryRequest({ ...base, packaging: true }));
  assert.ok(isDeliveryRequest({ ...base, packaging: false }));
  assert.equal(isDeliveryRequest({ ...base, packaging: 'yes' }), false);
});