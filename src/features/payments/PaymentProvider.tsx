import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import {
  answerOnPhone,
  sendPaymentRequest,
  type PhoneAnswer,
} from './mockGateway';
import {
  expireAllPayments,
  isPaid,
  isPaymentArchive,
  openAttempt,
  pendingDeadline,
  startPayment,
  withAmount,
  type Payment,
  type PaymentMethod,
  type PaymentResult,
} from './payment';

const STORAGE_KEY = 'rides.delivery.payments.v1';

type Archive = Record<string, Payment>;

type PaymentContextValue = {
  payments: Archive;
  loading: boolean;
  loadError: boolean;
  reload: () => Promise<void>;
  // Ask the customer's phone to approve the total. Creates the payment the
  // first time, and refuses if it is already paid or one is under way.
  pay: (
    requestId: string,
    amount: number,
    input: { method: PaymentMethod; phone: string },
  ) => Promise<PaymentResult>;
  // PROTOTYPE ONLY: answer the request as the customer would on their phone.
  answer: (requestId: string, answer: PhoneAnswer) => Promise<PaymentResult>;
  // Forget the record of a request that was cancelled. A paid request, or one
  // with a payment in flight, can never be forgotten.
  discard: (requestId: string) => Promise<void>;
};

const PaymentContext = createContext<PaymentContextValue | null>(null);

const unavailable: PaymentResult = {
  ok: false,
  error: 'Saved payments are unavailable. Try again.',
};

export function PaymentProvider({ children }: PropsWithChildren) {
  const [payments, setPayments] = useState<Archive>({});
  const current = useRef<Archive>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const writes = useRef<Promise<void>>(Promise.resolve());
  const [sweepTick, setSweepTick] = useState(0);
  const blockedUntil = useRef(0);

  const readArchive = useCallback(() => {
    return AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        const parsed: unknown = stored ? JSON.parse(stored) : {};
        if (!isPaymentArchive(parsed))
          throw new Error('Invalid saved payments');
        current.current = parsed;
        setPayments(parsed);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void readArchive();
  }, [readArchive]);

  const reload = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    return readArchive();
  }, [readArchive]);

  // Show the change immediately, then save. If saving fails, roll back.
  const commit = useCallback(async (next: Archive) => {
    const previous = current.current;
    current.current = next;
    setPayments(next);
    const write = writes.current.then(() =>
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)),
    );
    writes.current = write.catch(() => {});
    try {
      await write;
    } catch (error) {
      current.current = previous;
      setPayments(previous);
      throw error;
    }
  }, []);

  // A request on the customer's phone does not wait forever. One timer watches
  // them all, sleeps until the earliest deadline, then fails whatever ran out.
  useEffect(() => {
    if (loading || loadError) return;
    const deadlines = Object.values(payments)
      .map((entry) => pendingDeadline(entry))
      .filter((at): at is number => at !== undefined);
    if (deadlines.length === 0) return;
    const wakeAt = Math.max(Math.min(...deadlines), blockedUntil.current);
    const timer = setTimeout(
      () => {
        const next = expireAllPayments(current.current, Date.now());
        if (next === current.current) {
          setSweepTick((tick) => tick + 1); // woke a moment early, look again
          return;
        }
        // If saving fails, wait a few seconds before trying again.
        blockedUntil.current = Date.now() + 5000;
        commit(next)
          .then(() => {
            blockedUntil.current = 0;
          })
          .catch(() => {});
      },
      Math.max(wakeAt - Date.now(), 0) + 25,
    );
    return () => clearTimeout(timer);
  }, [payments, loading, loadError, commit, sweepTick]);

  const save = useCallback(
    async (payment: Payment): Promise<PaymentResult> => {
      try {
        await commit({ ...current.current, [payment.requestId]: payment });
      } catch {
        return { ok: false, error: 'Could not save this payment. Try again.' };
      }
      return { ok: true, payment };
    },
    [commit],
  );

  const pay = useCallback(
    async (
      requestId: string,
      amount: number,
      input: { method: PaymentMethod; phone: string },
    ): Promise<PaymentResult> => {
      if (loading || loadError) return unavailable;
      let payment =
        current.current[requestId] ?? startPayment(requestId, amount);
      if (payment.amount !== amount) {
        const changed = withAmount(payment, amount);
        if (!changed.ok) return changed;
        payment = changed.payment;
      }
      const sent = sendPaymentRequest(payment, {
        ...input,
        now: new Date().toISOString(),
      });
      return sent.ok ? save(sent.payment) : sent;
    },
    [loadError, loading, save],
  );

  const answer = useCallback(
    async (requestId: string, reply: PhoneAnswer): Promise<PaymentResult> => {
      if (loading || loadError) return unavailable;
      const existing = current.current[requestId];
      if (!existing) return { ok: false, error: 'No payment was found.' };
      const result = answerOnPhone(existing, reply, new Date().toISOString());
      return result.ok ? save(result.payment) : result;
    },
    [loadError, loading, save],
  );

  const discard = useCallback(
    async (requestId: string) => {
      if (loading || loadError)
        throw new Error('Saved payments are unavailable. Try again.');
      const existing = current.current[requestId];
      if (!existing) return;
      if (isPaid(existing))
        throw new Error('A paid request cannot be removed.');
      if (openAttempt(existing))
        throw new Error('A payment is in progress for this request.');
      const next = { ...current.current };
      delete next[requestId];
      await commit(next);
    },
    [commit, loadError, loading],
  );

  return (
    <PaymentContext.Provider
      value={{ payments, loading, loadError, reload, pay, answer, discard }}
    >
      {children}
    </PaymentContext.Provider>
  );
}

export function usePayments() {
  const value = useContext(PaymentContext);
  if (!value)
    throw new Error('usePayments must be used inside PaymentProvider');
  return value;
}