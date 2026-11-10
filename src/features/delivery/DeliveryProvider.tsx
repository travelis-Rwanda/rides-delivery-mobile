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

import { isDeliveryRequest, type DeliveryRequest } from './model';

const STORAGE_KEY = 'rides.delivery.previews.v1';
const MAX_SAVED_ROUTE_POINTS = 5_000;

type DeliveryContextValue = {
  requests: DeliveryRequest[];
  loading: boolean;
  loadError: boolean;
  reload: () => Promise<void>;
  save: (request: DeliveryRequest) => Promise<void>;
};

const DeliveryContext = createContext<DeliveryContextValue | null>(null);

export function DeliveryProvider({ children }: PropsWithChildren) {
  const [requests, setRequests] = useState<DeliveryRequest[]>([]);
  const current = useRef<DeliveryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const writes = useRef<Promise<void>>(Promise.resolve());

  const readArchive = useCallback(() => {
    return AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        const parsed: unknown = stored ? JSON.parse(stored) : [];
        if (!Array.isArray(parsed) || !parsed.every(isDeliveryRequest))
          throw new Error('Invalid saved requests');
        current.current = parsed;
        setRequests(parsed);
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

  const save = useCallback(
    async (request: DeliveryRequest) => {
      // Do not overwrite an unreadable archive with a new, incomplete list.
      if (loadError || loading)
        throw new Error(
          'Saved requests are unavailable. Try loading them again from Activity.',
        );
      if (!isDeliveryRequest(request))
        throw new Error('Please check your request details.');
      const write = writes.current.then(async () => {
        const next = [
          request,
          ...current.current.filter((entry) => entry.id !== request.id),
        ];
        // Large paths stay in memory and can be fetched again from the saved pins.
        const archive = next.map((entry) =>
          entry.roadRoute &&
          entry.roadRoute.path.length > MAX_SAVED_ROUTE_POINTS
            ? { ...entry, roadRoute: undefined }
            : entry,
        );
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(archive));
        current.current = next;
        setRequests(next);
      });
      writes.current = write.catch(() => {});
      await write;
    },
    [loadError, loading],
  );

  return (
    <DeliveryContext.Provider
      value={{ requests, loading, loadError, reload, save }}
    >
      {children}
    </DeliveryContext.Provider>
  );
}

export function useDelivery() {
  const value = useContext(DeliveryContext);
  if (!value)
    throw new Error('useDelivery must be used inside DeliveryProvider');
  return value;
}
