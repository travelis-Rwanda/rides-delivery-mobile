import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';

import { getMockDriver, mockDrivers } from '../negotiation/mockDrivers';

const STORAGE_KEY = 'rides.driver.session.v1';

type DriverSession = {
  driverId: string;
  loading: boolean;
  switchTo: (driverId: string) => void;
};

const DriverSessionContext = createContext<DriverSession | null>(null);

// PROTOTYPE ONLY. There is no driver login yet, so you choose which mock
// driver you are acting as. Replace this with the Rides driver account.
export function DriverSessionProvider({ children }: PropsWithChildren) {
  const [driverId, setDriverId] = useState(mockDrivers[0].id);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved && getMockDriver(saved)) setDriverId(saved);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const switchTo = useCallback((next: string) => {
    if (!getMockDriver(next)) return;
    setDriverId(next);
    // Remembering the choice is a convenience, so a failed save is ignored.
    void AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  return (
    <DriverSessionContext.Provider value={{ driverId, loading, switchTo }}>
      {children}
    </DriverSessionContext.Provider>
  );
}

export function useDriverSession() {
  const value = useContext(DriverSessionContext);
  if (!value)
    throw new Error('useDriverSession must be used inside DriverSessionProvider');
  return value;
}