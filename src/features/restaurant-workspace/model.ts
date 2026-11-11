import type { Coordinate } from '../maps/places';

export type RestaurantMenuItemVariant = {
  id: string;
  name: string;
  available: boolean;
};

export type RestaurantMenuItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  /** Explicit availability toggle — independent of any stock count. */
  available: boolean;
  photoKey?: string;
  imageKey?: string;
  imageUrl?: string;
  variants: RestaurantMenuItemVariant[];
};

export type RestaurantOrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'picked-up'
  | 'delivered'
  | 'completed'
  | 'rejected';

export type RestaurantOrderLine = {
  itemId: string;
  variantId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

export type RestaurantOrder = {
  id: string;
  placedAt: string;
  customer: string;
  status: RestaurantOrderStatus;
  lines: RestaurantOrderLine[];
  estimatedMinutes?: number;
  rejectionReason?: string;
};

export type RestaurantApplication = {
  name: string;
  cuisine: string;
  contact: string;
  address: string;
  pickupPoint?: Coordinate;
  photoKey?: string;
  submittedAt?: string;
};

export type RestaurantWorkspace = {
  menu: RestaurantMenuItem[];
  orders: RestaurantOrder[];
  application: RestaurantApplication;
};

export const orderStatusLabels: Record<RestaurantOrderStatus, string> = {
  pending: 'Awaiting confirmation',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready for pickup',
  'picked-up': 'Picked up',
  delivered: 'Delivered',
  completed: 'Completed',
  rejected: 'Rejected',
};

export function orderSubtotal(order: RestaurantOrder) {
  return order.lines.reduce(
    (sum, line) => sum + line.quantity * line.unitPrice,
    0,
  );
}

export function unavailableOrderLines(
  order: RestaurantOrder,
  menu: RestaurantMenuItem[],
) {
  return order.lines.filter((line) => {
    const item = menu.find((m) => m.id === line.itemId);
    if (!item) return true;
    if (item.variants.length) {
      const variant = item.variants.find((v) => v.id === line.variantId);
      return !variant?.available;
    }
    return !item.available;
  });
}

const nextStatus: Partial<Record<RestaurantOrderStatus, RestaurantOrderStatus>> =
  {
    pending: 'confirmed',
    confirmed: 'preparing',
    preparing: 'ready',
  };

export const orderActionLabels: Partial<
  Record<RestaurantOrderStatus, string>
> = {
  pending: 'Confirm order',
  confirmed: 'Start preparing',
  preparing: 'Mark ready for pickup',
};

export function advanceOrder(
  workspace: RestaurantWorkspace,
  id: string,
): RestaurantWorkspace {
  const order = workspace.orders.find((entry) => entry.id === id);
  const status = order && nextStatus[order.status];
  if (!order || !status)
    throw new Error('This order has already moved to another stage.');
  if (
    order.status === 'pending' &&
    unavailableOrderLines(order, workspace.menu).length
  )
    throw new Error(
      'Mark unavailable items as available or reject the order before confirming.',
    );
  return {
    ...workspace,
    orders: workspace.orders.map((entry) =>
      entry.id === id ? { ...entry, status } : entry,
    ),
  };
}

export function rejectOrder(
  workspace: RestaurantWorkspace,
  id: string,
  reason: string,
): RestaurantWorkspace {
  if (
    !workspace.orders.some(
      (entry) => entry.id === id && entry.status === 'pending',
    )
  )
    throw new Error('Only orders awaiting confirmation can be rejected.');
  if (!reason.trim()) throw new Error('Add a reason for rejecting the order.');
  return {
    ...workspace,
    orders: workspace.orders.map((entry) =>
      entry.id === id
        ? { ...entry, status: 'rejected', rejectionReason: reason.trim() }
        : entry,
    ),
  };
}

export function toggleItemAvailability(
  workspace: RestaurantWorkspace,
  itemId: string,
  variantId?: string,
): RestaurantWorkspace {
  return {
    ...workspace,
    menu: workspace.menu.map((item) => {
      if (item.id !== itemId) return item;
      if (variantId) {
        return {
          ...item,
          variants: item.variants.map((v) =>
            v.id === variantId ? { ...v, available: !v.available } : v,
          ),
        };
      }
      return { ...item, available: !item.available };
    }),
  };
}

export function wholeNumber(value: string) {
  const digits = value.trim();
  if (!/^\d+$/.test(digits)) return undefined;
  const number = Number(digits);
  return Number.isSafeInteger(number) ? number : undefined;
}
