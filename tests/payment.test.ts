/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  advanceAttempt,
  attemptId,
  beginAttempt,
  isPaid,
  isPayment,
  openAttempt,
  startPayment,
  withAmount,
  type Payment,
  type PaymentResult,
} from '../src/features/payments/payment';

const NOW = '2026-11-11T10:00:00.000Z';
const LATER = '2026-11-11T10:01:00.000Z';

function must(result: PaymentResult): Payment {
  assert.ok(result.ok, result.ok ? '' : result.error);
  return result.payment;
}

const begin = (p: Payment, phone = '0788 123 456') =>
  beginAttempt(p, {
    id: attemptId(p),
    method: 'mtn_momo',
    phone,
    now: NOW,
  });

const fresh = () => startPayment('r1', 5590);

test('a payment attempt starts initiated with the normalised phone and amount', () => {
  const p = must(begin(fresh()));
  assert.equal(p.attempts.length, 1);
  assert.equal(p.attempts[0].status, 'initiated');
  assert.equal(p.attempts[0].phone, '+250788123456');
  assert.equal(p.attempts[0].amount, 5590);
  assert.equal(p.attempts[0].id, 'r1:pay:1');
});

test('an invalid phone number or method cannot start a payment', () => {
  const bad = begin(fresh(), '12345');
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.match(bad.error, /valid Rwandan mobile number/);
  const noMethod = beginAttempt(fresh(), {
    id: 'x',
    method: 'cash' as never,
    phone: '0788123456',
    now: NOW,
  });
  assert.equal(noMethod.ok, false);
});

test('only one attempt can be open at a time', () => {
  const p = must(begin(fresh()));
  assert.equal(begin(p).ok, false);
  const pending = must(advanceAttempt(p, 'r1:pay:1', 'pending', LATER));
  assert.equal(begin(pending).ok, false);
});

test('a successful payment settles the delivery and blocks any new attempt', () => {
  let p = must(begin(fresh()));
  p = must(advanceAttempt(p, 'r1:pay:1', 'pending', LATER));
  p = must(advanceAttempt(p, 'r1:pay:1', 'succeeded', LATER));
  assert.ok(isPaid(p));
  assert.equal(openAttempt(p), undefined);
  assert.equal(begin(p).ok, false);
  assert.equal(advanceAttempt(p, 'r1:pay:1', 'failed', LATER).ok, false);
  assert.equal(withAmount(p, 6000).ok, false);
});

test('a failed attempt keeps its history and allows a retry', () => {
  let p = must(begin(fresh()));
  p = must(advanceAttempt(p, 'r1:pay:1', 'pending', LATER));
  p = must(
    advanceAttempt(p, 'r1:pay:1', 'failed', LATER, 'Insufficient balance.'),
  );
  assert.equal(p.attempts[0].failureReason, 'Insufficient balance.');
  assert.equal(isPaid(p), false);

  p = must(begin(p, '0731234567'));
  assert.equal(p.attempts.length, 2);
  assert.equal(p.attempts[0].status, 'failed');
  assert.equal(p.attempts[1].id, 'r1:pay:2');
  assert.equal(p.attempts[1].status, 'initiated');
});

test('a failure without a reason gets a plain default message', () => {
  const p = must(begin(fresh()));
  const failed = must(advanceAttempt(p, 'r1:pay:1', 'failed', LATER));
  assert.equal(
    failed.attempts[0].failureReason,
    'The payment did not go through.',
  );
});

test('cancelling works before the phone is asked, never after', () => {
  const p = must(begin(fresh()));
  const cancelled = must(advanceAttempt(p, 'r1:pay:1', 'cancelled', LATER));
  assert.equal(cancelled.attempts[0].status, 'cancelled');
  assert.ok(begin(cancelled).ok);

  const pending = must(advanceAttempt(p, 'r1:pay:1', 'pending', LATER));
  const refused = advanceAttempt(pending, 'r1:pay:1', 'cancelled', LATER);
  assert.equal(refused.ok, false);
  if (!refused.ok) assert.match(refused.error, /already on your phone/);
});

test('attempts cannot skip steps or move out of a finished state', () => {
  const p = must(begin(fresh()));
  assert.equal(advanceAttempt(p, 'r1:pay:1', 'succeeded', LATER).ok, false);
  assert.equal(advanceAttempt(p, 'missing', 'pending', LATER).ok, false);
  const failed = must(advanceAttempt(p, 'r1:pay:1', 'failed', LATER));
  assert.equal(advanceAttempt(failed, 'r1:pay:1', 'pending', LATER).ok, false);
});

test('the amount can change only while nothing is charged or in progress', () => {
  const p = fresh();
  assert.equal(must(withAmount(p, 6200)).amount, 6200);
  assert.equal(withAmount(p, 0).ok, false);
  assert.equal(withAmount(p, 99.5).ok, false);
  assert.equal(withAmount(must(begin(p)), 6200).ok, false);
});

test('a payment with no amount cannot start', () => {
  assert.equal(begin(startPayment('r1', 0)).ok, false);
});

test('saved payments survive a storage round trip and reject corruption', () => {
  let p = must(begin(fresh()));
  p = must(advanceAttempt(p, 'r1:pay:1', 'pending', LATER));
  p = must(advanceAttempt(p, 'r1:pay:1', 'succeeded', LATER));
  assert.ok(isPayment(JSON.parse(JSON.stringify(p))));
  assert.ok(isPayment(fresh()));

  const [attempt] = p.attempts;
  assert.equal(isPayment(null), false);
  assert.equal(isPayment({ ...p, amount: -1 }), false);
  assert.equal(
    isPayment({ ...p, attempts: [{ ...attempt, amount: 1 }] }),
    false,
  );
  assert.equal(
    isPayment({ ...p, attempts: [{ ...attempt, status: 'refunded' }] }),
    false,
  );
  // A phone that was not stored in +250 form is not a valid record.
  assert.equal(
    isPayment({ ...p, attempts: [{ ...attempt, phone: '0788123456' }] }),
    false,
  );
  // Two successful payments for one delivery would mean a double charge.
  assert.equal(
    isPayment({ ...p, attempts: [attempt, { ...attempt, id: 'r1:pay:2' }] }),
    false,
  );
  // Duplicate ids and an attempt that continues after a success.
  assert.equal(isPayment({ ...p, attempts: [attempt, attempt] }), false);
  assert.equal(
    isPayment({
      ...p,
      attempts: [attempt, { ...attempt, id: 'r1:pay:2', status: 'failed' }],
    }),
    false,
  );
});