/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildBreakdown } from '../src/features/pricing/breakdown';

const amount = (b: ReturnType<typeof buildBreakdown>, key: string) =>
  b.lines.find((line) => line.key === key)?.amount;

test('fee and tax are separate lines and the total adds them up', () => {
  // fee = 10% of 5000 = 500; tax = 18% of 500 = 90
  const result = buildBreakdown({ driverFare: 5000 });
  assert.equal(amount(result, 'driverFare'), 5000);
  assert.equal(amount(result, 'serviceFee'), 500);
  assert.equal(amount(result, 'tax'), 90);
  assert.equal(result.total, 5590);
});

test('small fares pay the minimum service fee', () => {
  const result = buildBreakdown({ driverFare: 1500 });
  assert.equal(amount(result, 'serviceFee'), 300);
  assert.equal(amount(result, 'tax'), 54);
});

test('merchant items are their own line and are not taxed as fare', () => {
  const result = buildBreakdown({ itemsSubtotal: 13000, driverFare: 2000 });
  assert.equal(amount(result, 'items'), 13000);
  assert.equal(result.total, 13000 + 2000 + 300 + 54);
});

test('the driver fare is never changed by fees', () => {
  assert.equal(amount(buildBreakdown({ driverFare: 3700 }), 'driverFare'), 3700);
});

test('tax base is configurable', () => {
  const result = buildBreakdown(
    { driverFare: 5000 },
    {
      fare: {} as never,
      serviceFee: { rate: 0.1, minimum: 300 },
      tax: { rate: 0.18, base: 'fareAndFee' },
      roundTo: 100,
      detourFactor: 1.3,
    },
  );
  assert.equal(amount(result, 'tax'), 990); // 18% of 5500
});