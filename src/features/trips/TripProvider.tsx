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

import { useNegotiation } from '../negotiation/NegotiationProvider';
import { usePayments } from '../payments/PaymentProvider';
import { syncTrips } from './sync';
import { isTripArchive, type Trip, type TripResult } from './trip';

const STORAGE_KEY = 'rides.delivery.trips.v1';

type Archive = Record<string, Trip>;

type TripContextValue = {
  trips: Archive;
  loading: boolean;
  loadError: boolean;
  reload: () => Promise<void>;
  // Move one delivery forward. The change gets the saved trip and the current
  // time, and the result is saved only if it succeeds.
  act: (
    requestId: string,
    change: (trip: Trip, now: string) => TripResult,
  ) => Promise<TripResult>;
};

const TripContext = createContext<TripContextValue | null>(null);

const unavailable: TripResult = {
  ok: false,
  error: 'Saved deliveries are unavailable. Try again.',
};

export function TripProvider({ children }: PropsWithChildren) {
  const { payments, loading: paymentsLoading, loadError: paymentsError } =
    usePayments();
  const {
    negotiations,
    loading: negotiationsLoading,
    loadError: negotiationsError,
  } = useNegotiation();

  const [trips, setTrips] = useState<Archive>({});
  const current = useRef<Archive>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const writes = useRef<Promise<void>>(Promise.resolve());

  const readArchive = useCallback(() => {
    return AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        const parsed: unknown = stored ? JSON.parse(stored) : {};
        if (!isTripArchive(parsed)) throw new Error('Invalid saved deliveries');
        current.current = parsed;
        setTrips(parsed);
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
    setTrips(next);
    const write = writes.current.then(() =>
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)),
    );
    writes.current = write.catch(() => {});
    try {
      await write;
    } catch (error) {
      current.current = previous;
      setTrips(previous);
      throw error;
    }
  }, []);

  // A delivery starts as soon as its payment succeeds. This only looks at
  // payments and negotiations, so a failed save does not retry in a loop.
  useEffect(() => {
    if (
      loading ||
      loadError ||
      paymentsLoading ||
      paymentsError ||
      negotiationsLoading ||
      negotiationsError
    )
      return;
    const next = syncTrips(current.current, payments, negotiations);
    if (next !== current.current) commit(next).catch(() => {});
  }, [
    payments,
    negotiations,
    loading,
    loadError,
    paymentsLoading,
    paymentsError,
    negotiationsLoading,
    negotiationsError,
    commit,
  ]);

  const act = useCallback(
    async (
      requestId: string,
      change: (trip: Trip, now: string) => TripResult,
    ): Promise<TripResult> => {
      if (loading || loadError) return unavailable;
      const existing = current.current[requestId];
      if (!existing) return { ok: false, error: 'No delivery was found.' };
      const result = change(existing, new Date().toISOString());
      if (!result.ok) return result;
      try {
        await commit({ ...current.current, [requestId]: result.trip });
      } catch {
        return { ok: false, error: 'Could not save this change. Try again.' };
      }
      return result;
    },
    [commit, loadError, loading],
  );

  return (
    <TripContext.Provider value={{ trips, loading, loadError, reload, act }}>
      {children}
    </TripContext.Provider>
  );
}

export function useTrips() {
  const value = useContext(TripContext);
  if (!value) throw new Error('useTrips must be used inside TripProvider');
  return value;
}