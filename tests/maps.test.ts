import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  findNearbyPlaces,
  findRoadRoute,
  resolveAddress,
  parseAddressResults,
  parseRoadRoute,
} from '../src/features/maps/mapsApi';

test('address results use the correct coordinate order and exclude foreign or invalid points', () => {
  const result = (
    name: string,
    countrycode: string,
    coordinates: number[],
  ) => ({
    geometry: { coordinates },
    properties: { name, city: 'Kimihurura', countrycode },
  });
  const landmark = result(
    'Kigali Convention Centre',
    'RW',
    [30.09466, -1.95473],
  );
  assert.deepEqual(
    parseAddressResults({
      features: [
        landmark,
        landmark,
        result('Foreign', 'BI', [30.1, -1.9]),
        result('Invalid', 'RW', [30.1, 110]),
      ],
    }),
    [
      {
        latitude: -1.95473,
        longitude: 30.09466,
        label: 'Kigali Convention Centre',
        detail: 'Kimihurura',
      },
    ],
  );
});

test('road routes preserve the provider’s distance and reject a missing or corrupt path', () => {
  const route = {
    distance: 3142.4,
    duration: 496,
    geometry: {
      coordinates: [
        [30.08, -1.94],
        [30.085, -1.945],
        [30.09, -1.95],
      ],
    },
  };
  const parsed = parseRoadRoute({ code: 'Ok', routes: [route] });
  assert.equal(parsed?.distanceMeters, 3142.4);
  assert.equal(parsed?.durationSeconds, 496);
  assert.deepEqual(parsed?.path[1], { longitude: 30.085, latitude: -1.945 });
  assert.equal(parseRoadRoute({ code: 'NoRoute' }), undefined);
  assert.equal(
    parseRoadRoute({
      code: 'Ok',
      routes: [
        {
          ...route,
          geometry: {
            coordinates: [
              [30, -1],
              [190, -1],
            ],
          },
        },
      ],
    }),
    undefined,
  );
});

test('reverse lookup uses street names without moving the selected pin', async (t) => {
  const point = { latitude: -1.95, longitude: 30.09 };
  t.mock.method(globalThis, 'fetch', async (input: string) => {
    const url = new URL(input);
    assert.equal(url.searchParams.get('lat'), String(point.latitude));
    assert.equal(url.searchParams.get('lon'), String(point.longitude));
    return new Response(
      JSON.stringify({
        features: [
          {
            geometry: { coordinates: [30.0902, -1.9501] },
            properties: {
              street: 'KG 541 Street',
              city: 'Kigali',
              countrycode: 'RW',
            },
          },
        ],
      }),
      { status: 200 },
    );
  });
  assert.deepEqual(await resolveAddress(point, new AbortController().signal), {
    ...point,
    label: 'KG 541 Street',
    detail: 'Kigali',
  });
});

test('nearby suggestions keep provider coordinates and are cached per area', async (t) => {
  const fetchPlaces = t.mock.method(
    globalThis,
    'fetch',
    async (input: string) => {
      const url = new URL(input);
      const longitude = Number(url.searchParams.get('lon'));
      return Response.json({
        features: [
          {
            geometry: { coordinates: [longitude + 0.001, -1.95] },
            properties: { name: 'Nearby landmark', countrycode: 'RW' },
          },
        ],
      });
    },
  );
  const signal = new AbortController().signal;
  const center = { latitude: -1.95, longitude: 30.08 };
  const first = await findNearbyPlaces(center, signal);
  const second = await findNearbyPlaces({ ...center, longitude: 30.1 }, signal);

  assert.equal(first[0]?.longitude, center.longitude + 0.001);
  assert.equal(second[0]?.longitude, 30.1 + 0.001);
  assert.deepEqual(await findNearbyPlaces(center, signal), first);
  assert.equal(fetchPlaces.mock.callCount(), 2);
});

test('driving route requests full geometry and retains road bends', async (t) => {
  const coordinates = [
    [30.08, -1.94],
    [30.081, -1.943],
    [30.086, -1.944],
    [30.09, -1.95],
  ];
  t.mock.method(globalThis, 'fetch', async (input: string) => {
    const url = new URL(input);
    assert.equal(url.searchParams.get('overview'), 'full');
    assert.equal(url.searchParams.get('geometries'), 'geojson');
    return Response.json({
      code: 'Ok',
      routes: [{ distance: 2200, duration: 320, geometry: { coordinates } }],
    });
  });

  const result = await findRoadRoute(
    { latitude: -1.94, longitude: 30.08 },
    { latitude: -1.95, longitude: 30.09 },
    new AbortController().signal,
  );
  assert.equal(result?.geometryDetail, 'full');
  assert.deepEqual(
    result?.path,
    coordinates.map(([longitude, latitude]) => ({ latitude, longitude })),
  );
});
