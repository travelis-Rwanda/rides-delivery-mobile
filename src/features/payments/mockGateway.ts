import {
  advanceAttempt,
  attemptId,
  beginAttempt,
  openAttempt,
  type Payment,
  type PaymentMethod,
  type PaymentResult,
} from './payment';

// MOCK. Replace this whole file with the Mobile Money API. The real one would
// send the payment request to the customer's phone, then report back what the
// customer did. Here the "phone" is answered from a prototype button, so no
// real money ever moves.

// Send a payment request to the customer's phone: start an attempt, then mark
// it pending because the request has reached them.
export function sendPaymentRequest(
  payment: Payment,
  input: { method: PaymentMethod; phone: string; now: string },
): PaymentResult {
  const started = beginAttempt(payment, {
    id: attemptId(payment),
    ...input,
  });
  if (!started.ok) return started;
  const sent = started.payment.attempts[started.payment.attempts.length - 1];
  return advanceAttempt(started.payment, sent.id, 'pending', input.now);
}

export type PhoneAnswer = 'approve' | 'decline';

// What the customer does on their phone.
export function answerOnPhone(
  payment: Payment,
  answer: PhoneAnswer,
  now: string,
): PaymentResult {
  const attempt = openAttempt(payment);
  if (!attempt || attempt.status !== 'pending')
    return { ok: false, error: 'No payment is waiting on a phone.' };
  return answer === 'approve'
    ? advanceAttempt(payment, attempt.id, 'succeeded', now)
    : advanceAttempt(
        payment,
        attempt.id,
        'failed',
        now,
        'The payment was declined on the phone.',
      );
}