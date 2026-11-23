/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  isDeliveryRequest,
  validateRequest,
  type DeliveryRequest,
} from '../src/features/delivery/model';
import {
  jobOf,
  rankDrivers,
  requestedVehicle,
  suggestedVehicle,
  vehicleFits,
  vehicleKinds,
  vehicleOptions,
  vehicleWarning,
  type Driver,
} from '../src/features/negotiation/selection';
import { tripKey } from '../src/features/pricing/forRequest';

const base: DeliveryRequest = {
  id: 'r1',
  service: 'parcel',
  pickup: 'Kimironko Market',
  destination: 'Kicukiro Centre',
  description: 'A gift box',
  method: 'pickup',
  size: 'Small',
  notes: '',
  pickupContact: { name: 'Eric Test', phone: '+250788123456' },
  receiverContact: { name: 'Aline Test', phone: '+250728123456' },
  quantities: {},
  createdAt: '2026-11-11T10:00:00.000Z',
  previewConfirmed: false,
};

const here = { latitude: -1.95, longitude: 30.1 };
const driver = (id: string, kind: Driver['kind']): Driver => ({
  id,
  name: id,
  vehicle: kind,
  kind,
  location: here,
});
const drivers = [
  driver('eric', 'moto'),
  driver('aline', 'cab'),
  driver('jp', 'hilux'),
];
const asks = { eric: 3000, aline: 3500, jp: 4000 };
const ids = (job: Parameters<typeof rankDrivers>[0]) =>
  rankDrivers(job).ranked.map((entry) => entry.driver.id);

test('a parcel can go in any vehicle, and cargo only in a pickup truck', () => {
  assert.deepEqual(vehicleOptions({ service: 'parcel' }), vehicleKinds);
  assert.deepEqual(vehicleOptions({ service: 'cargo' }), ['hilux']);
});

test('without a choice the suggested vehicle is used', () => {
  assert.equal(requestedVehicle(base), 'moto');
  assert.equal(requestedVehicle({ ...base, size: 'Large' }), 'hilux');
  assert.equal(requestedVehicle({ ...base, vehicle: 'cab' }), 'cab');
  assert.equal(
    requestedVehicle({ ...base, service: 'cargo' }),
    suggestedVehicle({ service: 'cargo', size: 'Small' }),
  );
});

test('a choice that is not allowed for the service is ignored', () => {
  assert.equal(
    requestedVehicle({ ...base, service: 'cargo', vehicle: 'moto' }),
    'hilux',
  );
});

test('only drivers whose vehicle is at least the chosen one can take the job', () => {
  const fits = (vehicle?: Driver['kind']) =>
    vehicleKinds.filter((kind) => vehicleFits(kind, { ...base, vehicle }));
  assert.deepEqual(fits(), ['moto', 'cab', 'hilux']); // suggestion for a small parcel
  assert.deepEqual(fits('moto'), ['moto', 'cab', 'hilux']);
  assert.deepEqual(fits('cab'), ['cab', 'hilux']);
  assert.deepEqual(fits('hilux'), ['hilux']);
});

test('the chosen vehicle decides which drivers are matched', () => {
  const job = {
    service: 'parcel',
    size: 'Small',
    urgent: false,
    drivers,
    asks,
  } as const;
  assert.deepEqual(ids({ ...job }), ['eric', 'aline', 'jp']);
  assert.deepEqual(ids({ ...job, vehicle: 'cab' }), ['aline', 'jp']);
  assert.deepEqual(ids({ ...job, vehicle: 'hilux' }), ['jp']);
});

test('a customer can ask for a smaller vehicle than suggested, with a warning', () => {
  const medium = { ...base, size: 'Medium' as const };
  assert.equal(vehicleWarning(medium), undefined); // follows the suggestion
  assert.equal(vehicleWarning({ ...medium, vehicle: 'hilux' }), undefined); // bigger is fine
  assert.equal(
    vehicleWarning({ ...medium, vehicle: 'moto' }),
    'Moto Bike is smaller than the Cab Taxi we suggest for a medium item. A driver may decline it.',
  );
  // And the matching follows what they asked for.
  assert.equal(vehicleFits('moto', { ...medium, vehicle: 'moto' }), true);
});

test('the job passes the chosen vehicle on to matching', () => {
  assert.equal(jobOf(base).vehicle, undefined);
  assert.equal(jobOf({ ...base, vehicle: 'cab' }).vehicle, 'cab');
});

test('changing the vehicle restarts the negotiation, following the suggestion does not', () => {
  const key = tripKey(base);
  assert.equal(tripKey({ ...base, vehicle: 'moto' }), key); // the suggestion
  assert.equal(tripKey({ ...base, vehicle: undefined }), key);
  assert.notEqual(tripKey({ ...base, vehicle: 'cab' }), key);
  assert.notEqual(
    tripKey({ ...base, vehicle: 'cab' }),
    tripKey({ ...base, vehicle: 'hilux' }),
  );
  // For a medium parcel the suggestion is the cab.
  const medium = { ...base, size: 'Medium' as const };
  assert.equal(tripKey({ ...medium, vehicle: 'cab' }), tripKey(medium));
});

test('saved requests keep the chosen vehicle and reject unknown ones', () => {
  assert.ok(isDeliveryRequest(base));
  assert.ok(isDeliveryRequest({ ...base, vehicle: 'cab' }));
  assert.ok(
    isDeliveryRequest(
      JSON.parse(JSON.stringify({ ...base, vehicle: 'hilux' })),
    ),
  );
  assert.equal(isDeliveryRequest({ ...base, vehicle: 'bicycle' }), false);
  assert.equal(isDeliveryRequest({ ...base, vehicle: 3 }), false);
});

test('a chosen vehicle must be able to carry the delivery', () => {
  assert.equal(validateRequest({ ...base, vehicle: 'cab' }).vehicle, undefined);
  assert.equal(
    validateRequest({ ...base, vehicle: 'moto' }).vehicle,
    undefined,
  );
  assert.equal(
    validateRequest({ ...base, service: 'cargo', vehicle: 'moto' }).vehicle,
    'Choose a vehicle that can carry this item.',
  );
  assert.equal(
    validateRequest({ ...base, service: 'cargo', vehicle: 'hilux' }).vehicle,
    undefined,
  );
});