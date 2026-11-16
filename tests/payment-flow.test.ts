/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  answerOnPhone,
  sendPaymentRequest,
} from '../src/features/payments/mockGateway';
import {
  PENDING_TTL_MS,
  expireAllPayments,
  expirePending,
  isPaid,
  isPayment,
  isPaymentArchive,
  openAttempt,
  pendingDeadline,
  startPayment,
  type Payment,
  type PaymentResult,
} from '../src/features/payments/payment';

const START = Date.parse('2026-11-11T10:00:00.000Z');
const at = (seconds: number) => new Date(START + seconds * 1000).toISOString();
const ms = (seconds: number) => START + seconds * 1000;

function must(result: PaymentResult): Payment {
  assert.ok(result.ok, result.ok ? '' : result.error);
  return result.payment;
}

const send = (p: Payment, seconds = 0, phone = '0788 123 456') =>
  sendPaymentRequest(p, { method: 'mtn_momo', phone, now: at(seconds) });

const fresh = () => startPayment('r1', 5590);

test('sending a request leaves it pending on the customer’s phone', () => {
  const p = must(send(fresh(), 5));
  assert.equal(p.attempts.length, 1);
  assert.equal(p.attempts[0].status, 'pending');
  assert.equal(p.attempts[0].phone, '+250788123456');
  assert.equal(p.attempts[0].createdAt, at(5));
  assert.equal(p.attempts[0].updatedAt, at(5));
});

test('a bad number is refused before anything is sent', () => {
  const result = send(fresh(), 0, 'abc');
  assert.equal(result.ok, false);
  assert.equal(fresh().attempts.length, 0);
});

test('you cannot send a second request while one is waiting, or after paying', () => {
  const p = must(send(fresh()));
  assert.equal(send(p, 10).ok, false);
  const paid = must(answerOnPhone(p, 'approve', at(20)));
  assert.equal(send(paid, 30).ok, false);
});

test('approving on the phone completes the payment', () => {
  const p = must(answerOnPhone(must(send(fresh())), 'approve', at(20)));
  assert.ok(isPaid(p));
  assert.equal(p.attempts[0].status, 'succeeded');
  assert.equal(p.attempts[0].updatedAt, at(20));
  assert.equal(openAttempt(p), undefined);
});

test('declining on the phone fails the attempt, and the customer can try again', () => {
  let p = must(answerOnPhone(must(send(fresh())), 'decline', at(20)));
  assert.equal(isPaid(p), false);
  assert.equal(p.attempts[0].status, 'failed');
  assert.equal(
    p.attempts[0].failureReason,
    'The payment was declined on the phone.',
  );
  p = must(send(p, 30));
  assert.equal(p.attempts.length, 2);
  assert.equal(p.attempts[1].status, 'pending');
});

test('there is nothing to answer when no request is waiting', () => {
  assert.equal(answerOnPhone(fresh(), 'approve', at(0)).ok, false);
  const paid = must(answerOnPhone(must(send(fresh())), 'approve', at(20)));
  assert.equal(answerOnPhone(paid, 'decline', at(30)).ok, false);
});

test('a request on the phone expires after two minutes', () => {
  assert.equal(PENDING_TTL_MS, 120_000);
  const p = must(send(fresh(), 10));
  assert.equal(pendingDeadline(p), ms(130));
  assert.equal(pendingDeadline(p, 30_000), ms(40));
  assert.equal(pendingDeadline(fresh()), undefined);

  assert.equal(expirePending(p, ms(129)), p);
  assert.equal(expirePending(p, ms(10)), p);

  const expired = expirePending(p, ms(130));
  assert.notEqual(expired, p);
  assert.equal(expired.attempts[0].status, 'failed');
  assert.match(expired.attempts[0].failureReason ?? '', /expired/);
  assert.equal(expired.attempts[0].updatedAt, at(130));
  assert.equal(isPaid(expired), false);
  assert.ok(isPayment(expired));
  // The customer can try again afterwards.
  assert.ok(send(expired, 140).ok);
});

test('only a pending request expires', () => {
  const paid = must(answerOnPhone(must(send(fresh())), 'approve', at(20)));
  assert.equal(expirePending(paid, ms(99999)), paid);
  const untouched = fresh();
  assert.equal(expirePending(untouched, ms(99999)), untouched);
  const declined = must(answerOnPhone(must(send(fresh())), 'decline', at(20)));
  assert.equal(expirePending(declined, ms(99999)), declined);
});

test('every saved payment is checked, and only the expired ones change', () => {
  const waiting = must(send(fresh(), 0));
  const paid = must(
    answerOnPhone(must(send(startPayment('r2', 3000), 0)), 'approve', at(20)),
  );
  const archive = { r1: waiting, r2: paid };

  assert.equal(expireAllPayments(archive, ms(60)), archive);

  const after = expireAllPayments(archive, ms(130));
  assert.notEqual(after, archive);
  assert.equal(after.r1.attempts[0].status, 'failed');
  assert.equal(after.r2, paid);
});

test('the saved store accepts good records and rejects damaged ones', () => {
  const p = must(send(fresh()));
  assert.ok(isPaymentArchive({}));
  assert.ok(isPaymentArchive({ r1: p }));
  assert.ok(isPaymentArchive(JSON.parse(JSON.stringify({ r1: p }))));
  assert.equal(isPaymentArchive(null), false);
  assert.equal(isPaymentArchive([]), false);
  assert.equal(isPaymentArchive({ r1: { ...p, amount: -5 } }), false);
  // Filed under the wrong request.
  assert.equal(isPaymentArchive({ other: p }), false);
});