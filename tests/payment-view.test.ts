/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { DeliveryRequest } from '../src/features/delivery/model';
import { openWithMockOffers } from '../src/features/negotiation/mockDrivers';
import { acceptOffer } from '../src/features/negotiation/negotiation';
import { requestPricing, tripKey } from '../src/features/pricing/forRequest';
import {
  answerOnPhone,
  sendPaymentRequest,
} from '../src/features/payments/mockGateway';
import {
  advanceAttempt,
  isPaid,
  startPayment,
  withAmount,
  type Payment,
  type PaymentResult,
} from '../src/features/payments/payment';
import {
  formatCountdown,
  payableTotal,
  paymentState,
  receiptRows,
} from '../src/features/payments/view';

const NOW = '2026-11-11T10:00:00.000Z';
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
  createdAt: NOW,
  previewConfirmed: true,
};

function must(result: PaymentResult): Payment {
  assert.ok(result.ok, result.ok ? '' : result.error);
  return result.payment;
}

const send = (p: Payment, phone = '0788 123 456') =>
  sendPaymentRequest(p, { method: 'mtn_momo', phone, now: NOW });

// A parcel whose fare was agreed at 2,100 with the first driver.
const agreed = (request: DeliveryRequest) => {
  const opened = openWithMockOffers('r1', 1900, NOW, tripKey(base));
  const locked = acceptOffer(opened, opened.offers[0].id, 'customer');
  assert.ok(locked.ok);
  return requestPricing(request, locked.negotiation);
};

test('a request with no payment is unpaid', () => {
  assert.deepEqual(paymentState(undefined), { kind: 'unpaid' });
  assert.deepEqual(paymentState(startPayment('r1', 2100)), { kind: 'unpaid' });
});

test('a request on the phone is pending, and the latest attempt decides', () => {
  const sent = must(send(startPayment('r1', 2100)));
  assert.equal(paymentState(sent).kind, 'pending');

  const failed = must(answerOnPhone(sent, 'decline', NOW));
  const state = paymentState(failed);
  assert.equal(state.kind, 'failed');
  if (state.kind === 'failed')
    assert.equal(
      state.attempt.failureReason,
      'The payment was declined on the phone.',
    );

  // A retry makes it pending again, and approving it makes it paid.
  const retried = must(send(failed));
  assert.equal(paymentState(retried).kind, 'pending');
  const paid = must(answerOnPhone(retried, 'approve', NOW));
  assert.equal(paymentState(paid).kind, 'paid');
  assert.ok(isPaid(paid));
});

test('an attempt that failed before reaching the phone shows as failed', () => {
  const started = must(
    advanceAttempt(
      must(
        sendPaymentRequest(startPayment('r1', 2100), {
          method: 'airtel_money',
          phone: '0738123456',
          now: NOW,
        }),
      ),
      'r1:pay:1',
      'failed',
      NOW,
    ),
  );
  assert.equal(paymentState(started).kind, 'failed');
});

test('only an agreed fare can be paid, and the total is everything owed', () => {
  assert.equal(payableTotal(requestPricing(base)), undefined);
  assert.equal(
    payableTotal(requestPricing({ ...base, service: 'restaurant' })),
    undefined,
  );
  assert.equal(payableTotal(agreed(base)), 2100);
});

test('packaging is part of what the customer pays, but not of the negotiated fare', () => {
  const pricing = agreed({ ...base, packaging: true });
  assert.equal(pricing.kind, 'agreed');
  if (pricing.kind !== 'agreed') return;
  // 2,100 negotiated + 500 packaging + 90 tax on it.
  assert.equal(pricing.negotiated, 2100);
  assert.equal(payableTotal(pricing), 2690);
  assert.equal(pricing.breakdown.total, 2690);
});

test('the amount charged is the total, and it can change only before paying', () => {
  const total = payableTotal(agreed(base))!;
  let payment = startPayment('r1', total);
  // The customer adds packaging before paying, so the total goes up.
  const newTotal = payableTotal(agreed({ ...base, packaging: true }))!;
  payment = must(withAmount(payment, newTotal));
  assert.equal(payment.amount, 2690);

  payment = must(send(payment));
  assert.equal(payment.attempts[0].amount, 2690);
  // Once a request is on the phone, the amount is fixed.
  assert.equal(withAmount(payment, 3000).ok, false);
});

test('a countdown reads as minutes and seconds', () => {
  assert.equal(formatCountdown(125), '2:05');
  assert.equal(formatCountdown(120), '2:00');
  assert.equal(formatCountdown(59.9), '0:59');
  assert.equal(formatCountdown(9), '0:09');
  assert.equal(formatCountdown(0), '0:00');
  assert.equal(formatCountdown(-4), '0:00');
});

test('the receipt shows what was paid, how, from which number, and the reference', () => {
  const paid = must(
    answerOnPhone(must(send(startPayment('r1', 2100))), 'approve', NOW),
  );
  const state = paymentState(paid);
  assert.equal(state.kind, 'paid');
  if (state.kind !== 'paid') return;
  assert.deepEqual(receiptRows(state.attempt), [
    { label: 'Amount', value: 'RWF 2,100' },
    { label: 'Paid with', value: 'MTN Mobile Money' },
    { label: 'From number', value: '+250 788 123 456' },
    { label: 'Reference', value: 'r1:pay:1' },
  ]);
});