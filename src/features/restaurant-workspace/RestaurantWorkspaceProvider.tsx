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

import { isCoordinate } from '../maps/places';
import { orderStatusLabels, type RestaurantWorkspace } from './model';
import { validPhotoKey } from './photoAsset';
import { makeSampleWorkspace } from './sample';

const storageKey = 'rides.restaurant-workspace.preview.v1';

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isCount(value: unknown) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function strings(value: Record<string, unknown>, keys: string[]) {
  return keys.every((key) => typeof value[key] === 'string');
}

function isOptionalPhotoKey(value: unknown) {
  return (
    value === undefined ||
    (typeof value === 'string' && validPhotoKey.test(value))
  );
}

function isWorkspace(value: unknown): value is RestaurantWorkspace {
  return (
    isRecord(value) &&
    isRecord(value.application) &&
    strings(value.application, ['name', 'cuisine', 'contact', 'address']) &&
    (value.application.pickupPoint === undefined ||
      isCoordinate(value.application.pickupPoint)) &&
    isOptionalPhotoKey(value.application.photoKey) &&
    (value.application.submittedAt === undefined ||
      typeof value.application.submittedAt === 'string') &&
    Array.isArray(value.menu) &&
    value.menu.every(
      (item: unknown) =>
        isRecord(item) &&
        strings(item, ['id', 'name', 'description', 'category']) &&
        isCount(item.price) &&
        typeof item.available === 'boolean' &&
        isOptionalPhotoKey(item.photoKey) &&
        (item.imageKey === undefined || typeof item.imageKey === 'string') &&
        (item.imageUrl === undefined || typeof item.imageUrl === 'string') &&
        Array.isArray(item.variants) &&
        item.variants.every(
          (v: unknown) =>
            isRecord(v) &&
            strings(v, ['id', 'name']) &&
            typeof v.available === 'boolean',
        ),
    ) &&
    Array.isArray(value.orders) &&
    value.orders.every(
      (order: unknown) =>
        isRecord(order) &&
        strings(order, ['id', 'placedAt', 'customer', 'status']) &&
        Object.hasOwn(orderStatusLabels, String(order.status)) &&
        (order.rejectionReason === undefined ||
          typeof order.rejectionReason === 'string') &&
        (order.estimatedMinutes === undefined ||
          typeof order.estimatedMinutes === 'number') &&
        Array.isArray(order.lines) &&
        order.lines.every(
          (line: unknown) =>
            isRecord(line) &&
            strings(line, ['itemId', 'name']) &&
            (line.variantId === undefined ||
              typeof line.variantId === 'string') &&
            isCount(line.quantity) &&
            isCount(line.unitPrice),
        ),
    )
  );
}

type Context = {
  workspace: RestaurantWorkspace | null;
  loading: boolean;
  saving: boolean;
  error: string;
  reload: () => void;
  update: (
    change: (current: RestaurantWorkspace) => RestaurantWorkspace,
  ) => Promise<boolean>;
};

const RestaurantContext = createContext<Context | null>(null);

export function RestaurantWorkspaceProvider({ children }: PropsWithChildren) {
  const [workspace, setWorkspace] = useState<RestaurantWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const latest = useRef<RestaurantWorkspace | null>(null);
  const writing = useRef(false);

  const load = useCallback(() => {
    return AsyncStorage.getItem(storageKey)
      .then((stored) => {
        const data: unknown =
          stored === null ? makeSampleWorkspace() : JSON.parse(stored);
        if (!isWorkspace(data)) throw new Error('Invalid restaurant preview');
        latest.current = data;
        setWorkspace(data);
      })
      .catch(() =>
        setError('The restaurant preview could not be loaded. Try again.'),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function reload() {
    setLoading(true);
    setError('');
    void load();
  }

  async function update(
    change: (current: RestaurantWorkspace) => RestaurantWorkspace,
  ) {
    if (writing.current || !latest.current) return false;
    setError('');
    let next: RestaurantWorkspace;
    try {
      next = change(latest.current);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'This change could not be applied.',
      );
      return false;
    }
    writing.current = true;
    setSaving(true);
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(next));
      latest.current = next;
      setWorkspace(next);
      return true;
    } catch {
      setError('Your change could not be saved. Try again.');
      return false;
    } finally {
      writing.current = false;
      setSaving(false);
    }
  }

  return (
    <RestaurantContext.Provider
      value={{ workspace, loading, saving, error, reload, update }}
    >
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurantWorkspace() {
  const context = useContext(RestaurantContext);
  if (!context) throw new Error('RestaurantWorkspaceProvider is required.');
  return context;
}
