import { formatPhone } from '../delivery/contact';
import { formatMoney } from '../delivery/services';
import type { RequestPricing } from '../pricing/forRequest';
import { methodLabels, type Payment, type PaymentAttempt } from './payment';

// Where a request's payment stands, in the terms a screen needs.
export type PaymentState =
  | { kind: 'unpaid' } // nothing sent yet, or the customer backed out
  | { kind: 'pending'; attempt: PaymentAttempt } // waiting on the phone
  | { kind: 'failed'; attempt: PaymentAttempt } // the last try did not work
  | { kind: 'paid'; attempt: PaymentAttempt };

export function paymentState(payment: Payment | undefined): PaymentState {
  const attempt = payment?.attempts[payment.attempts.length - 1];
  if (!attempt) return { kind: 'unpaid' };
  switch (attempt.status) {
    case 'succeeded':
      return { kind: 'paid', attempt };
    case 'initiated':
    case 'pending':
      return { kind: 'pending', attempt };
    case 'failed':
      return { kind: 'failed', attempt };
    default:
      return { kind: 'unpaid' };
  }
}

// What the customer pays, or undefined when there is nothing to pay yet:
// restaurant and shop orders, and parcels with no agreed fare.
export function payableTotal(pricing: RequestPricing): number | undefined {
  return pricing.kind === 'agreed' ? pricing.total : undefined;
}

// 125 seconds -> 2:05
export function formatCountdown(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

export function receiptRows(attempt: PaymentAttempt) {
  return [
    { label: 'Amount', value: formatMoney(attempt.amount) },
    { label: 'Paid with', value: methodLabels[attempt.method] },
    { label: 'From number', value: formatPhone(attempt.phone) },
    { label: 'Reference', value: attempt.id },
  ];
}