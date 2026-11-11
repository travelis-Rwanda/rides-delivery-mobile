import type { RestaurantWorkspace } from './model';

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const sampleRestaurant = {
  name: 'The Kigali Kitchen',
  cuisine: 'Rwandan & Continental',
};


export function makeSampleWorkspace(): RestaurantWorkspace {
  return {
    application: {
      name: 'The Kigali Kitchen',
      cuisine: 'Rwandan & Continental',
      contact: '+250 788 000 001',
      address: 'KG 11 Ave, Kimihurura, Kigali',
      pickupPoint: { latitude: -1.9528, longitude: 30.0898 },
    },
    menu: [
      {
        id: 'item-1',
        name: 'Grilled chicken & rice',
        description: 'Marinated grilled chicken, steamed rice, fresh salad',
        category: 'Main course',
        price: 6500,
        available: true,
        imageKey: 'chicken',
        variants: [],
      },
      {
        id: 'item-2',
        name: 'Garden bowl',
        description: 'Seasonal vegetables, grains, avocado, lemon dressing',
        category: 'Salads & bowls',
        price: 4500,
        available: true,
        imageKey: 'bowl',
        variants: [],
      },
      {
        id: 'item-3',
        name: 'Classic beef burger',
        description: 'Beef patty, lettuce, tomato, pickles, fries',
        category: 'Burgers',
        price: 5500,
        available: true,
        imageKey: 'burger',
        variants: [
          { id: 'v-3-1', name: 'Standard', available: true },
          { id: 'v-3-2', name: 'Double patty', available: true },
        ],
      },
      {
        id: 'item-4',
        name: 'Fresh coffee',
        description: 'Rwandan single-origin, served hot or iced',
        category: 'Drinks',
        price: 1500,
        available: false,
        imageKey: 'coffee',
        variants: [
          { id: 'v-4-1', name: 'Hot', available: false },
          { id: 'v-4-2', name: 'Iced', available: false },
        ],
      },
      {
        id: 'item-5',
        name: 'Artisan bread loaf',
        description: 'Stone-baked sourdough, daily baked',
        category: 'Bakery',
        price: 3000,
        available: true,
        imageKey: 'bread',
        variants: [],
      },
    ],
    orders: [
      {
        id: 'RO-20240001',
        placedAt: new Date(Date.now() - 4 * 60000).toISOString(),
        customer: 'Amina K.',
        status: 'pending',
        lines: [
          { itemId: 'item-1', name: 'Grilled chicken & rice', quantity: 2, unitPrice: 6500 },
          { itemId: 'item-2', name: 'Garden bowl', quantity: 1, unitPrice: 4500 },
        ],
      },
      {
        id: 'RO-20240002',
        placedAt: new Date(Date.now() - 22 * 60000).toISOString(),
        customer: 'Jean P.',
        status: 'preparing',
        estimatedMinutes: 15,
        lines: [
          {
            itemId: 'item-3',
            variantId: 'v-3-2',
            name: 'Classic beef burger (Double patty)',
            quantity: 1,
            unitPrice: 5500,
          },
        ],
      },
      {
        id: 'RO-20240003',
        placedAt: new Date(Date.now() - 55 * 60000).toISOString(),
        customer: 'Marie N.',
        status: 'ready',
        lines: [
          { itemId: 'item-5', name: 'Artisan bread loaf', quantity: 2, unitPrice: 3000 },
        ],
      },
      {
        id: 'RO-20240004',
        placedAt: new Date(Date.now() - 3 * 3600000).toISOString(),
        customer: 'Claude M.',
        status: 'completed',
        lines: [
          { itemId: 'item-2', name: 'Garden bowl', quantity: 2, unitPrice: 4500 },
          { itemId: 'item-5', name: 'Artisan bread loaf', quantity: 1, unitPrice: 3000 },
        ],
      },
    ],
  };
}

type SampleSettlement = {
  id: string;
  orderId: string;
  date: string;
  sales: number;
  deductions: number;
  payout: number;
  status: 'Paid' | 'Pending';
};

export const sampleSettlements: SampleSettlement[] = [
  {
    id: `STL-${newId()}`,
    orderId: 'RO-20240004',
    date: '10 Nov 2026',
    sales: 12000,
    deductions: 1800,
    payout: 10200,
    status: 'Pending',
  },
  {
    id: `STL-${newId()}`,
    orderId: 'RO-20240003',
    date: '9 Nov 2026',
    sales: 6000,
    deductions: 900,
    payout: 5100,
    status: 'Paid',
  },
  {
    id: `STL-${newId()}`,
    orderId: 'RO-20240002',
    date: '8 Nov 2026',
    sales: 5500,
    deductions: 825,
    payout: 4675,
    status: 'Paid',
  },
];
