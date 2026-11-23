/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { directionsUrl } from '../src/features/trips/directions';

const request = {
  pickup: 'Kimironko Market',
  pickupPoint: { latitude: -1.9441, longitude: 30.1264 },
  destination: 'Nyamirambo Stadium',
  destinationPoint: { latitude: -1.9747, longitude: 30.0419 },
};

test('directions use the exact spot the customer picked on the map', () => {
  assert.equal(
    directionsUrl(request, 'pickup'),
    'https://www.google.com/maps/dir/?api=1&destination=-1.9441%2C30.1264&travelmode=driving',
  );
  assert.equal(
    directionsUrl(request, 'destination'),
    'https://www.google.com/maps/dir/?api=1&destination=-1.9747%2C30.0419&travelmode=driving',
  );
});

test('directions fall back to the typed address when there is no map point', () => {
  const typed = {
    pickup: '  KG 11 Ave, Kigali ',
    destination: 'Remera & Gisimenti',
  };
  assert.equal(
    directionsUrl(typed, 'pickup'),
    'https://www.google.com/maps/dir/?api=1&destination=KG%2011%20Ave%2C%20Kigali&travelmode=driving',
  );
  assert.equal(
    directionsUrl(typed, 'destination'),
    'https://www.google.com/maps/dir/?api=1&destination=Remera%20%26%20Gisimenti&travelmode=driving',
  );
});

test('each end of the trip gets its own link', () => {
  assert.notEqual(directionsUrl(request, 'pickup'), directionsUrl(request, 'destination'));
});