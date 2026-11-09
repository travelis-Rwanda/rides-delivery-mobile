import type { CatalogItem } from '../delivery/services';

export type MerchantService = 'restaurant' | 'shop';
export type Merchant = {
  id: string;
  service: MerchantService;
  name: string;
  category: string;
  tagline: string;
  description: string;
  cover: string;
  collection: string;
  products: readonly CatalogItem[];
};

const food = (
  id: string,
  name: string,
  description: string,
  price: number,
  imageKey: string,
): CatalogItem => ({ id, name, description, price, imageKey, icon: 'food' });
const goods = (
  id: string,
  name: string,
  description: string,
  price: number,
  imageKey: string,
): CatalogItem => ({ id, name, description, price, imageKey, icon: 'shop' });

// Fictional businesses and illustrative prices until merchant APIs are connected.
export const merchants: readonly Merchant[] = [
  {
    id: 'mango-kitchen',
    service: 'restaurant',
    name: 'Mango Kitchen',
    category: 'Kitchen',
    tagline: 'Big flavour. Everyday favourites.',
    cover: 'chicken',
    collection: 'Kitchen favourites',
    description:
      'Comforting plates, colourful bowls, and a little something for every appetite.',
    products: [
      food(
        'mango-chicken',
        'Grilled chicken & rice',
        'Grilled chicken, fragrant rice, fresh salad.',
        6500,
        'chicken',
      ),
      food(
        'mango-bowl',
        'Garden bowl',
        'Seasonal vegetables, grains, and avocado.',
        4500,
        'bowl',
      ),
      food(
        'mango-burger',
        'Classic beef burger',
        'A toasted bun, beef patty, lettuce, and tomato.',
        5500,
        'burger',
      ),
      food(
        'mango-coffee',
        'House coffee',
        'Freshly brewed. A little lift for your day.',
        2000,
        'coffee',
      ),
    ],
  },
  {
    id: 'green-table',
    service: 'restaurant',
    name: 'The Green Table',
    category: 'Bowls',
    tagline: 'Feel-good food, full of colour.',
    cover: 'bowl',
    collection: 'Fresh from the kitchen',
    description:
      'Bright, vegetable-led bowls and simple sides made for a slower lunch.',
    products: [
      food(
        'green-bowl',
        'Signature garden bowl',
        'A colourful mix of vegetables and grains.',
        5500,
        'bowl',
      ),
      food(
        'green-bread',
        'Sourdough side',
        'A small loaf with a crisp, golden crust.',
        3000,
        'bread',
      ),
      food(
        'green-coffee',
        'Fresh filter coffee',
        'A smooth, freshly brewed cup.',
        2500,
        'coffee',
      ),
    ],
  },
  {
    id: 'bun-and-brew',
    service: 'restaurant',
    name: 'Bun & Brew',
    category: 'Café',
    tagline: 'Your next favourite lunch break.',
    cover: 'burger',
    collection: 'The good stuff',
    description:
      'Burgers, fresh bread, and good coffee. Keep lunch beautifully simple.',
    products: [
      food(
        'bun-burger',
        'The house burger',
        'Beef, crisp lettuce, tomato, and house sauce.',
        6000,
        'burger',
      ),
      food(
        'bun-loaf',
        'Fresh sourdough loaf',
        'Golden on the outside, soft in the middle.',
        4000,
        'bread',
      ),
      food(
        'bun-coffee',
        'House cappuccino',
        'Espresso with silky steamed milk.',
        3000,
        'coffee',
      ),
    ],
  },
  {
    id: 'daily-market',
    service: 'shop',
    name: 'Daily Market',
    category: 'Groceries',
    tagline: 'A well-stocked day starts here.',
    cover: 'produce',
    collection: 'Everyday essentials',
    description:
      'Fresh produce, pantry staples, and the small things that keep your day moving.',
    products: [
      goods(
        'daily-produce',
        'Fresh produce basket',
        'A mixed selection of seasonal vegetables.',
        7000,
        'produce',
      ),
      goods(
        'daily-pantry',
        'Pantry essentials',
        'A selection of everyday kitchen staples.',
        12000,
        'pantry',
      ),
      goods(
        'daily-bread',
        'Fresh sourdough loaf',
        'One freshly baked, golden loaf.',
        3500,
        'bread',
      ),
    ],
  },
  {
    id: 'corner-pantry',
    service: 'shop',
    name: 'The Corner Pantry',
    category: 'Pantry',
    tagline: 'Good things for your kitchen.',
    cover: 'bread',
    collection: 'Stock up on the good things',
    description:
      'Bread, pantry picks, and coffee for unhurried breakfasts and everyday meals.',
    products: [
      goods(
        'corner-bread',
        'Artisan sourdough',
        'A freshly baked loaf for your table.',
        4500,
        'bread',
      ),
      goods(
        'corner-pantry',
        'Kitchen starter basket',
        'A selection of cupboard essentials.',
        10000,
        'pantry',
      ),
      goods(
        'corner-coffee',
        'Morning coffee',
        'A freshly prepared cup to take with you.',
        2500,
        'coffee',
      ),
    ],
  },
  {
    id: 'home-edit',
    service: 'shop',
    name: 'The Home Edit',
    category: 'Home',
    tagline: 'Little upgrades for everyday living.',
    cover: 'home',
    collection: 'A little care for your home',
    description:
      'Thoughtfully chosen home-care essentials to keep your space feeling fresh.',
    products: [
      goods(
        'home-care',
        'Home care set',
        'A curated selection of everyday care essentials.',
        8500,
        'home',
      ),
      goods(
        'home-clean',
        'Cleaning essentials',
        'A spray cleaner and cleaning supplies.',
        5000,
        'cleaning',
      ),
    ],
  },
];

export function isMerchantService(value: unknown): value is MerchantService {
  return value === 'restaurant' || value === 'shop';
}

export function getMerchant(id: unknown, service?: unknown) {
  return merchants.find(
    (merchant) =>
      merchant.id === id &&
      (service === undefined || merchant.service === service),
  );
}

export function searchMerchants(
  service: MerchantService,
  query = '',
  category = 'All',
) {
  const term = query.trim().toLocaleLowerCase();
  return merchants.filter(
    (merchant) =>
      merchant.service === service &&
      (category === 'All' || merchant.category === category) &&
      [
        merchant.name,
        merchant.category,
        merchant.tagline,
        merchant.description,
        ...merchant.products.flatMap((product) => [
          product.name,
          product.description,
        ]),
      ].some((text) => text.toLocaleLowerCase().includes(term)),
  );
}

export function sanitiseBasket(
  merchant: Merchant,
  values: Record<string, number>,
) {
  return Object.fromEntries(
    merchant.products.flatMap((item) => {
      const quantity = values[item.id];
      return Number.isInteger(quantity) && quantity > 0 && quantity <= 20
        ? [[item.id, quantity]]
        : [];
    }),
  );
}

export function basketSummary(
  merchant: Merchant,
  quantities: Record<string, number>,
) {
  const safe = sanitiseBasket(merchant, quantities);
  return merchant.products.reduce(
    (summary, item) => {
      const quantity = safe[item.id] ?? 0;
      return {
        count: summary.count + quantity,
        subtotal: summary.subtotal + item.price * quantity,
      };
    },
    { count: 0, subtotal: 0 },
  );
}

export function sameMerchantBasket(
  merchant: Merchant,
  left: Record<string, number>,
  right: Record<string, number>,
) {
  return merchant.products.every(
    (item) => (left[item.id] ?? 0) === (right[item.id] ?? 0),
  );
}
