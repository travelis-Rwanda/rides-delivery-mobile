/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  breakdownForTotal,
  buildBreakdown,
  driverFareForTotal,
  totalForDriverFare,
} from '../src/features/pricing/breakdown';
import type { PricingConfig } from '../src/features/pricing/config';
import { pricingConfig } from '../src/features/pricing/config';

const amount = (total: number, key: string) =>
  breakdownForTotal(total)?.lines.find((line) => line.key === key)?.amount;

test('the total for a driver fare includes the service fee and tax', () => {
  // 5000 + 10% fee 500 + 18% tax on the fee 90.
  assert.equal(totalForDriverFare(5000), 5590);
  // Small fares pay the minimum fee: 1500 + 300 + 54.
  assert.equal(totalForDriverFare(1500), 1854);
});

test('an agreed total splits into driver fare, service fee and tax', () => {
  const breakdown = breakdownForTotal(5590)!;
  assert.equal(amount(5590, 'driverFare'), 5000);
  assert.equal(amount(5590, 'serviceFee'), 500);
  assert.equal(amount(5590, 'tax'), 90);
  assert.equal(breakdown.total, 5590);
});

test('the lines always add up to exactly the agreed total', () => {
  for (let total = 400; total <= 60000; total += 37) {
    const breakdown = breakdownForTotal(total)!;
    assert.ok(breakdown, String(total));
    const sum = breakdown.lines.reduce((acc, line) => acc + line.amount, 0);
    assert.equal(sum, total, String(total));
    for (const line of breakdown.lines) assert.ok(line.amount >= 0, line.key);
  }
});

test('a total built from a driver fare splits back to that exact fare', () => {
  for (let fare = 0; fare <= 40000; fare += 53) {
    assert.equal(
      driverFareForTotal(totalForDriverFare(fare)),
      fare,
      String(fare),
    );
  }
});

test('a higher total never gives the driver less', () => {
  let previous = -1;
  for (let total = 400; total <= 20000; total += 1) {
    const fare = driverFareForTotal(total)!;
    assert.ok(fare >= previous, String(total));
    previous = fare;
  }
});

test('rounding leftovers go to the service fee and stay small', () => {
  for (let total = 400; total <= 20000; total += 1) {
    const fare = driverFareForTotal(total)!;
    const regular = buildBreakdown({ driverFare: fare });
    const fee = amount(total, 'serviceFee')!;
    const regularFee = regular.lines.find(
      (l) => l.key === 'serviceFee',
    )!.amount;
    // The driver gets exactly the fare the rules give, and the fee line
    // differs from the rule only by the franc or two left over.
    assert.ok(fee >= regularFee && fee - regularFee <= 3, String(total));
    assert.equal(
      amount(total, 'tax'),
      regular.lines.find((l) => l.key === 'tax')!.amount,
    );
  }
});

test('a total too small to cover the fees is rejected', () => {
  assert.equal(breakdownForTotal(100), null);
  assert.equal(breakdownForTotal(0), null);
  assert.equal(breakdownForTotal(-5), null);
  assert.equal(breakdownForTotal(5590.5), null);
  assert.equal(driverFareForTotal(100), null);
  assert.ok(breakdownForTotal(totalForDriverFare(0)));
});

test('splitting follows the configured fee and tax rules', () => {
  const taxOnFareAndFee: PricingConfig = {
    ...pricingConfig,
    tax: { rate: 0.18, base: 'fareAndFee' },
  };
  // 5000 + 500 fee + 18% of 5500 = 990 tax.
  assert.equal(totalForDriverFare(5000, taxOnFareAndFee), 6490);
  assert.equal(driverFareForTotal(6490, taxOnFareAndFee), 5000);
  for (let total = 600; total <= 30000; total += 41) {
    const sum = breakdownForTotal(total, taxOnFareAndFee)!.lines.reduce(
      (acc, line) => acc + line.amount,
      0,
    );
    assert.equal(sum, total, String(total));
  }
});

test('the agreed split matches what buildBreakdown shows for that fare', () => {
  const split = breakdownForTotal(5590)!;
  const built = buildBreakdown({ driverFare: 5000 });
  assert.deepEqual(split.lines, built.lines);
  assert.equal(split.total, built.total);
});