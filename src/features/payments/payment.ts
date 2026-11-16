import { normalizeRwandaPhone } from '../delivery/contact';

export type PaymentMethod = 'mtn_momo' | 'airtel_money';
export type AttemptStatus =
  | 'initiated'
  | 'pending'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

export const methodLabels: Record<PaymentMethod, string> = {
  mtn_momo: 'MTN Mobile Money',
  airtel_money: 'Airtel Money',
};

export type PaymentAttempt = {
  id: string;
  method: PaymentMethod;
  phone: string; // the number charged, stored as +2507XXXXXXXX
  amount: number; // whole RWF
  status: AttemptStatus;
  createdAt: string;
  updatedAt: string; // when it last changed status
  failureReason?: string;
};

// One payment per delivery request. Each try is an attempt, so a failed
// payment keeps its history and a retry never overwrites it.
export type Payment = {
  requestId: string;
  amount: number; // the total the customer pays, whole RWF
  attempts: PaymentAttempt[];
};

export type PaymentResult =
  | { ok: true; payment: Payment }
  | { ok: false; error: string };

const fail = (error: string): PaymentResult => ({ ok: false, error });
const ok = (payment: Payment): PaymentResult => ({ ok: true, payment });

const attemptStatuses: readonly AttemptStatus[] = [
  'initiated',
  'pending',
  'succeeded',
  'failed',
  'cancelled',
];
const isOpen = (status: AttemptStatus) =>
  status === 'initiated' || status === 'pending';

// Cancelling is only possible before the request reaches the customer's
// phone. Once it is pending, the customer could still approve it there, so
// the app waits for the real outcome instead of pretending it was cancelled.
const allowedMoves: Record<AttemptStatus, readonly AttemptStatus[]> = {
  initiated: ['pending', 'failed', 'cancelled'],
  pending: ['succeeded', 'failed'],
  succeeded: [],
  failed: [],
  cancelled: [],
};

export function startPayment(requestId: string, amount: number): Payment {
  return { requestId, amount, attempts: [] };
}

export function openAttempt(payment: Payment): PaymentAttempt | undefined {
  return payment.attempts.find((attempt) => isOpen(attempt.status));
}

export function paidAttempt(payment: Payment): PaymentAttempt | undefined {
  return payment.attempts.find((attempt) => attempt.status === 'succeeded');
}

export const isPaid = (payment: Payment) => !!paidAttempt(payment);

export function attemptId(payment: Payment) {
  return `${payment.requestId}:pay:${payment.attempts.length + 1}`;
}

// The total can change while nothing has been charged, for example when a new
// fare is agreed. It can never change once a payment is under way or paid.
export function withAmount(payment: Payment, amount: number): PaymentResult {
  if (!Number.isSafeInteger(amount) || amount <= 0)
    return fail('The amount must be a whole number of RWF.');
  if (isPaid(payment)) return fail('This delivery is already paid.');
  if (openAttempt(payment))
    return fail('A payment is in progress, so the amount can’t change.');
  return ok({ ...payment, amount });
}

// Start a new payment attempt. At most one attempt can be open at a time and
// nothing can start once a payment has succeeded, so nobody is charged twice.
export function beginAttempt(
  payment: Payment,
  input: {
    id: string;
    method: PaymentMethod;
    phone: string;
    now: string;
  },
): PaymentResult {
  if (isPaid(payment)) return fail('This delivery is already paid.');
  if (openAttempt(payment))
    return fail('A payment is already in progress for this delivery.');
  if (!(input.method in methodLabels))
    return fail('Choose how you want to pay.');
  const phone = normalizeRwandaPhone(input.phone);
  if (!phone)
    return fail(
      'Enter a valid Rwandan mobile number, for example 0788 123 456.',
    );
  if (!Number.isSafeInteger(payment.amount) || payment.amount <= 0)
    return fail('There is nothing to pay yet.');

  return ok({
    ...payment,
    attempts: [
      ...payment.attempts,
      {
        id: input.id,
        method: input.method,
        phone,
        amount: payment.amount,
        status: 'initiated',
        createdAt: input.now,
        updatedAt: input.now,
      },
    ],
  });
}

// Move an attempt to its next status, following the rules above.
export function advanceAttempt(
  payment: Payment,
  id: string,
  to: AttemptStatus,
  now: string,
  failureReason?: string,
): PaymentResult {
  const attempt = payment.attempts.find((entry) => entry.id === id);
  if (!attempt) return fail('This payment attempt was not found.');
  if (attempt.status === 'pending' && to === 'cancelled')
    return fail(
      'The request is already on your phone. Approve or decline it there, or wait for it to expire.',
    );
  if (!allowedMoves[attempt.status].includes(to))
    return fail('This payment can’t move to that step.');

  return ok({
    ...payment,
    attempts: payment.attempts.map((entry) =>
      entry.id === id
        ? {
            ...entry,
            status: to,
            updatedAt: now,
            ...(to === 'failed'
              ? {
                  failureReason:
                    failureReason ?? 'The payment did not go through.',
                }
              : {}),
          }
        : entry,
    ),
  });
}

// A request on the customer's phone does not wait forever. If it is not
// answered within this long, it counts as failed so the customer can try again.
export const PENDING_TTL_MS = 120_000;

// When the pending request runs out, in milliseconds, or undefined if nothing
// is waiting on a phone.
export function pendingDeadline(
  payment: Payment,
  ttlMs: number = PENDING_TTL_MS,
): number | undefined {
  const attempt = payment.attempts.find((entry) => entry.status === 'pending');
  if (!attempt) return undefined;
  const since = Date.parse(attempt.updatedAt);
  return Number.isFinite(since) ? since + ttlMs : undefined;
}

// Fail a pending request that has run out of time. Returns the same object
// when nothing is due.
export function expirePending(
  payment: Payment,
  nowMs: number,
  ttlMs: number = PENDING_TTL_MS,
): Payment {
  const deadline = pendingDeadline(payment, ttlMs);
  const attempt = payment.attempts.find((entry) => entry.status === 'pending');
  if (deadline === undefined || !attempt || nowMs < deadline) return payment;
  const result = advanceAttempt(
    payment,
    attempt.id,
    'failed',
    new Date(nowMs).toISOString(),
    'The request on your phone expired. You can try again.',
  );
  return result.ok ? result.payment : payment;
}

// Every saved payment, with the ones that ran out of time failed. Returns the
// same object when nothing changed, so callers can tell cheaply.
export function expireAllPayments(
  payments: Readonly<Record<string, Payment>>,
  nowMs: number,
  ttlMs?: number,
): Record<string, Payment> {
  let changed = false;
  const next: Record<string, Payment> = {};
  for (const [id, payment] of Object.entries(payments)) {
    const updated = expirePending(payment, nowMs, ttlMs);
    if (updated !== payment) changed = true;
    next[id] = updated;
  }
  return changed ? next : (payments as Record<string, Payment>);
}

const isAttempt = (value: unknown): value is PaymentAttempt => {
  if (!value || typeof value !== 'object') return false;
  const a = value as Record<string, unknown>;
  return (
    typeof a.id === 'string' &&
    !!a.id &&
    (a.method === 'mtn_momo' || a.method === 'airtel_money') &&
    typeof a.phone === 'string' &&
    normalizeRwandaPhone(a.phone) === a.phone &&
    typeof a.amount === 'number' &&
    Number.isSafeInteger(a.amount) &&
    a.amount > 0 &&
    attemptStatuses.includes(a.status as AttemptStatus) &&
    typeof a.createdAt === 'string' &&
    Number.isFinite(Date.parse(a.createdAt)) &&
    typeof a.updatedAt === 'string' &&
    Number.isFinite(Date.parse(a.updatedAt)) &&
    (a.failureReason === undefined || typeof a.failureReason === 'string')
  );
};

// Used when reading saved data back. A damaged save must never show a payment
// that did not happen, so the money rules are checked here as well.
export function isPayment(value: unknown): value is Payment {
  if (!value || typeof value !== 'object') return false;
  const p = value as Record<string, unknown>;
  if (
    typeof p.requestId !== 'string' ||
    !p.requestId ||
    typeof p.amount !== 'number' ||
    !Number.isSafeInteger(p.amount) ||
    p.amount <= 0 ||
    !Array.isArray(p.attempts) ||
    !p.attempts.every(isAttempt)
  )
    return false;

  const attempts = p.attempts as PaymentAttempt[];
  const last = attempts[attempts.length - 1];
  return (
    new Set(attempts.map((a) => a.id)).size === attempts.length &&
    attempts.every((a) => a.amount === p.amount) &&
    attempts.filter((a) => a.status === 'succeeded').length <= 1 &&
    attempts.filter((a) => isOpen(a.status)).length <= 1 &&
    attempts.every(
      (a) => (a.status !== 'succeeded' && !isOpen(a.status)) || a === last,
    )
  );
}

// The whole saved store: every entry valid, and filed under its own request.
export function isPaymentArchive(
  value: unknown,
): value is Record<string, Payment> {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.entries(value).every(
      ([id, entry]) => isPayment(entry) && entry.requestId === id,
    )
  );
}