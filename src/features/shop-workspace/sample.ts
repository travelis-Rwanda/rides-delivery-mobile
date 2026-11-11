import { getMerchant } from '../merchants/catalog';
import type { ShopWorkspace } from './model';

export const sampleShop = getMerchant('daily-market', 'shop')!;
export function makeSampleWorkspace(): ShopWorkspace {
  const products = sampleShop.products.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    category: item.id === 'daily-bread' ? 'Bakery' : 'Groceries',
    price: item.price,
    stock: item.stockQuantity ?? 0,
    imageKey: item.imageKey,
    variants: [],
  }));
  return {
    products,
    application: { name: '', category: '', contact: '', pickupAddress: '' },
    orders: [
      {
        id: 'SHOP-1042',
        placedAt: '2026-11-10T10:20:00+02:00',
        customer: 'Aline M.',
        status: 'pending',
        lines: [
          {
            productId: 'daily-produce',
            name: 'Fresh produce basket',
            quantity: 2,
            unitPrice: 7000,
          },
          {
            productId: 'daily-pantry',
            name: 'Pantry essentials',
            quantity: 1,
            unitPrice: 12000,
          },
        ],
      },
      {
        id: 'SHOP-1041',
        placedAt: '2026-11-10T09:45:00+02:00',
        customer: 'Eric K.',
        status: 'preparing',
        lines: [
          {
            productId: 'daily-pantry',
            name: 'Pantry essentials',
            quantity: 1,
            unitPrice: 12000,
          },
        ],
      },
      {
        id: 'SHOP-1039',
        placedAt: '2026-11-09T16:30:00+02:00',
        customer: 'Diane N.',
        status: 'completed',
        lines: [
          {
            productId: 'daily-produce',
            name: 'Fresh produce basket',
            quantity: 3,
            unitPrice: 7000,
          },
        ],
      },
    ],
  };
}

export const sampleSettlements = [
  {
    id: 'STL-014',
    orderId: 'SHOP-1039',
    date: '9 Nov 2026',
    sales: 21000,
    deductions: 1050,
    payout: 19950,
    status: 'Pending',
  },
  {
    id: 'STL-013',
    orderId: 'SHOP-1035',
    date: '6 Nov 2026',
    sales: 24000,
    deductions: 1200,
    payout: 22800,
    status: 'Paid',
  },
] as const;
