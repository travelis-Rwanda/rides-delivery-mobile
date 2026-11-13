
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

import { expireAll } from './assignment';
import { openWithMockOffers } from './mockDrivers';
import {
  finalOfferDeadline,
  isNegotiation,
  type Negotiation,
  type Result,
} from './negotiation';
import type { Job } from './selection';

const STORAGE_KEY = 'rides.delivery.negotiations.v1';

type Archive = Record<string, Negotiation>;

type NegotiationContextValue = {
  negotiations: Archive;
  loading: boolean;
  loadError: boolean;
  reload: () => Promise<void>;
  open: (
    requestId: string,
    minimumFare: number,
    tripKey: string,
    job?: Job,
  ) => Promise<Negotiation>;
  update: (
    requestId: string,
    change: (current: Negotiation) => Result,
  ) => Promise<Result>;
  discard: (requestId: string) => Promise<void>;
};

const NegotiationContext = createContext<NegotiationContextValue | null>(null);

const isArchive = (value: unknown): value is Archive =>
  !!value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.entries(value).every(
    ([id, entry]) => isNegotiation(entry) && entry.requestId === id,
  );

export function NegotiationProvider({ children }: PropsWithChildren) {
  const [negotiations, setNegotiations] = useState<Archive>({});
  const current = useRef<Archive>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const writes = useRef<Promise<void>>(Promise.resolve());

  const readArchive = useCallback(() => {
    return AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        const parsed: unknown = stored ? JSON.parse(stored) : {};
        if (!isArchive(parsed)) throw new Error('Invalid saved negotiations');
        current.current = parsed;
        setNegotiations(parsed);
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
    setNegotiations(next);
    const write = writes.current.then(() =>
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)),
    );
    writes.current = write.catch(() => {});
    try {
      await write;
    } catch (error) {
      current.current = previous;
      setNegotiations(previous);
      throw error;
    }
  }, []);

  const open = useCallback(
    async (
      requestId: string,
      minimumFare: number,
      tripKey: string,
      job?: Job,
    ) => {
      if (loading || loadError)
        throw new Error('Saved negotiations are unavailable. Try again.');
      const existing = current.current[requestId];
      if (existing) return existing;
      const created = openWithMockOffers(
        requestId,
        minimumFare,
        new Date().toISOString(),
        tripKey,
        job,
      );
      await commit({ ...current.current, [requestId]: created });
      return created;
    },
    [commit, loadError, loading],
  );

  const update = useCallback(
    async (
      requestId: string,
      change: (existing: Negotiation) => Result,
    ): Promise<Result> => {
      if (loading || loadError)
        return { ok: false, error: 'Saved negotiations are unavailable. Try again.' };
      const existing = current.current[requestId];
      if (!existing) return { ok: false, error: 'This negotiation was not found.' };
      const result = change(existing);
      if (!result.ok) return result;
      try {
        await commit({ ...current.current, [requestId]: result.negotiation });
      } catch {
        return { ok: false, error: 'Could not save this change. Try again.' };
      }
      return result;
    },
    [commit, loadError, loading],
  );

    // A final offer runs out even when nobody has its screen open, so one timer
  // watches them all. It sleeps until the earliest deadline, then moves every
  // expired negotiation on to its next driver.
  const [sweepTick, setSweepTick] = useState(0);
  const blockedUntil = useRef(0);
  useEffect(() => {
    if (loading || loadError) return;
    const deadlines = Object.values(negotiations)
      .map((entry) => finalOfferDeadline(entry))
      .filter((at): at is number => at !== undefined);
    if (deadlines.length === 0) return;
    const wakeAt = Math.max(Math.min(...deadlines), blockedUntil.current);
    const timer = setTimeout(
      () => {
        const next = expireAll(current.current, Date.now());
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
  }, [negotiations, loading, loadError, commit, sweepTick]);

  // Forget a negotiation, e.g. when the trip changed and old offers are void.
  const discard = useCallback(
    async (requestId: string) => {
      if (loading || loadError)
        throw new Error('Saved negotiations are unavailable. Try again.');
      if (!(requestId in current.current)) return;
      await commit(
        Object.fromEntries(
          Object.entries(current.current).filter(([key]) => key !== requestId),
        ),
      );
    },
    [commit, loadError, loading],
  );

  return (
    <NegotiationContext.Provider
      value={{ negotiations, loading, loadError, reload, open, update, discard }}
    >
      {children}
    </NegotiationContext.Provider>
  );
}

export function useNegotiation() {
  const value = useContext(NegotiationContext);
  if (!value)
    throw new Error('useNegotiation must be used inside NegotiationProvider');
  return value;
}
