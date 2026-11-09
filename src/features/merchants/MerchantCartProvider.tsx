import {
  createContext,
  useCallback,
  useContext,
  useState,
  type PropsWithChildren,
} from 'react';

import { getMerchant, sanitiseBasket } from './catalog';

type Basket = Record<string, number>;
const EMPTY: Basket = {};
const CartContext = createContext<{
  carts: Record<string, Basket>;
  replace: (merchantId: string, basket: Basket, basketKey?: string) => void;
} | null>(null);

export function MerchantCartProvider({ children }: PropsWithChildren) {
  const [carts, setCarts] = useState<Record<string, Basket>>({});
  const replace = useCallback(
    (merchantId: string, basket: Basket, basketKey = merchantId) => {
      const merchant = getMerchant(merchantId);
      if (!merchant) return;
      setCarts((current) => ({
        ...current,
        [basketKey]: sanitiseBasket(merchant, basket),
      }));
    },
    [],
  );
  return (
    <CartContext.Provider value={{ carts, replace }}>
      {children}
    </CartContext.Provider>
  );
}

export function useMerchantCart(
  merchantId?: string,
  requestId?: string,
  initial: Basket = EMPTY,
) {
  const context = useContext(CartContext);
  if (!context) throw new Error('MerchantCartProvider is required.');
  const key = requestId ? `${merchantId}/request/${requestId}` : merchantId;
  return {
    quantities: key ? (context.carts[key] ?? initial) : EMPTY,
    replace: (basket: Basket) => {
      if (merchantId) context.replace(merchantId, basket, key);
    },
  };
}
