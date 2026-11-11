import type { Coordinate } from '../maps/places';

export type ShopVariant = { id: string; name: string; stock: number };

export type ShopProduct = {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  photoKey?: string;
  imageKey?: string;
  imageUrl?: string;
  variants: ShopVariant[];
};

export type ShopOrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'picked-up'
  | 'delivered'
  | 'completed'
  | 'rejected';

export type ShopOrderLine = {
  productId: string;
  variantId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

export type ShopOrder = {
  id: string;
  placedAt: string;
  customer: string;
  status: ShopOrderStatus;
  lines: ShopOrderLine[];
  rejectionReason?: string;
};

export type ShopApplication = {
  name: string;
  category: string;
  contact: string;
  pickupAddress: string;
  pickupPoint?: Coordinate;
  photoKey?: string;
  submittedAt?: string;
};

export type ShopWorkspace = {
  products: ShopProduct[];
  orders: ShopOrder[];
  application: ShopApplication;
};

export const orderStatusLabels: Record<ShopOrderStatus, string> = {
  pending: 'Awaiting confirmation',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready for pickup',
  'picked-up': 'Picked up',
  delivered: 'Delivered',
  completed: 'Completed',
  rejected: 'Rejected',
};

export function totalStock(product: ShopProduct) {
  return product.variants.length
    ? product.variants.reduce((sum, variant) => sum + variant.stock, 0)
    : product.stock;
}

export function orderSubtotal(order: ShopOrder) {
  return order.lines.reduce(
    (sum, line) => sum + line.quantity * line.unitPrice,
    0,
  );
}

function stockForLine(product: ShopProduct | undefined, line: ShopOrderLine) {
  if (!product) return 0;
  if (!product.variants.length) return line.variantId ? 0 : product.stock;
  return (
    product.variants.find((variant) => variant.id === line.variantId)?.stock ??
    0
  );
}

export function unavailableOrderLines(
  order: ShopOrder,
  products: ShopProduct[],
) {
  return order.lines.filter((line) => {
    const required = order.lines.reduce(
      (sum, entry) =>
        entry.productId === line.productId && entry.variantId === line.variantId
          ? sum + entry.quantity
          : sum,
      0,
    );
    return (
      required >
      stockForLine(
        products.find((product) => product.id === line.productId),
        line,
      )
    );
  });
}

const nextStatus: Partial<Record<ShopOrderStatus, ShopOrderStatus>> = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
};

export const orderActionLabels: Partial<Record<ShopOrderStatus, string>> = {
  pending: 'Confirm order',
  confirmed: 'Start preparing',
  preparing: 'Mark ready for pickup',
};

export function advanceOrder(
  workspace: ShopWorkspace,
  id: string,
): ShopWorkspace {
  const order = workspace.orders.find((entry) => entry.id === id);
  const status = order && nextStatus[order.status];
  if (!order || !status)
    throw new Error('This order has already moved to another stage.');
  if (
    order.status === 'pending' &&
    unavailableOrderLines(order, workspace.products).length
  )
    throw new Error(
      'Update availability or reject the order before continuing.',
    );

  let products = workspace.products;
  if (order.status === 'pending') {
    products = products.map((product) => {
      const lines = order.lines.filter((line) => line.productId === product.id);
      if (!lines.length) return product;
      const usedStock = (variantId?: string) =>
        lines.reduce(
          (sum, line) =>
            line.variantId === variantId ? sum + line.quantity : sum,
          0,
        );
      return product.variants.length
        ? {
            ...product,
            variants: product.variants.map((variant) => ({
              ...variant,
              stock: variant.stock - usedStock(variant.id),
            })),
          }
        : { ...product, stock: product.stock - usedStock() };
    });
  }

  return {
    ...workspace,
    products,
    orders: workspace.orders.map((entry) =>
      entry.id === id ? { ...entry, status } : entry,
    ),
  };
}

export function rejectOrder(
  workspace: ShopWorkspace,
  id: string,
  reason: string,
): ShopWorkspace {
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

export function wholeNumber(value: string) {
  const digits = value.trim();
  if (!/^\d+$/.test(digits)) return undefined;
  const number = Number(digits);
  return Number.isSafeInteger(number) ? number : undefined;
}
