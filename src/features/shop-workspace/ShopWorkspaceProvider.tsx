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
import { orderStatusLabels, type ShopWorkspace } from './model';
import { validPhotoKey } from './photoAsset';
import { makeSampleWorkspace } from './sample';

const storageKey = 'rides.shop-workspace.preview.v1';

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

function isWorkspace(value: unknown): value is ShopWorkspace {
  return (
    isRecord(value) &&
    isRecord(value.application) &&
    strings(value.application, [
      'name',
      'category',
      'contact',
      'pickupAddress',
    ]) &&
    (value.application.pickupPoint === undefined ||
      isCoordinate(value.application.pickupPoint)) &&
    isOptionalPhotoKey(value.application.photoKey) &&
    (value.application.submittedAt === undefined ||
      typeof value.application.submittedAt === 'string') &&
    Array.isArray(value.products) &&
    value.products.every(
      (product: unknown) =>
        isRecord(product) &&
        strings(product, ['id', 'name', 'description', 'category']) &&
        isCount(product.price) &&
        isCount(product.stock) &&
        isOptionalPhotoKey(product.photoKey) &&
        (product.imageKey === undefined ||
          typeof product.imageKey === 'string') &&
        (product.imageUrl === undefined ||
          typeof product.imageUrl === 'string') &&
        Array.isArray(product.variants) &&
        product.variants.every(
          (variant: unknown) =>
            isRecord(variant) &&
            strings(variant, ['id', 'name']) &&
            isCount(variant.stock),
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
        Array.isArray(order.lines) &&
        order.lines.every(
          (line: unknown) =>
            isRecord(line) &&
            strings(line, ['productId', 'name']) &&
            (line.variantId === undefined ||
              typeof line.variantId === 'string') &&
            isCount(line.quantity) &&
            isCount(line.unitPrice),
        ),
    )
  );
}

type Context = {
  workspace: ShopWorkspace | null;
  loading: boolean;
  saving: boolean;
  error: string;
  reload: () => void;
  update: (
    change: (current: ShopWorkspace) => ShopWorkspace,
  ) => Promise<boolean>;
};

const ShopContext = createContext<Context | null>(null);

export function ShopWorkspaceProvider({ children }: PropsWithChildren) {
  const [workspace, setWorkspace] = useState<ShopWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const latest = useRef<ShopWorkspace | null>(null);
  const writing = useRef(false);
  const load = useCallback(() => {
    return AsyncStorage.getItem(storageKey)
      .then((stored) => {
        const data: unknown =
          stored === null ? makeSampleWorkspace() : JSON.parse(stored);
        if (!isWorkspace(data)) throw new Error('Invalid shop preview');
        latest.current = data;
        setWorkspace(data);
      })
      .catch(() => setError('The shop preview could not be loaded. Try again.'))
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

  async function update(change: (current: ShopWorkspace) => ShopWorkspace) {
    if (writing.current || !latest.current) return false;
    setError('');
    let next: ShopWorkspace;
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
    <ShopContext.Provider
      value={{ workspace, loading, saving, error, reload, update }}
    >
      {children}
    </ShopContext.Provider>
  );
}

export function useShopWorkspace() {
  const context = useContext(ShopContext);
  if (!context) throw new Error('ShopWorkspaceProvider is required.');
  return context;
}
