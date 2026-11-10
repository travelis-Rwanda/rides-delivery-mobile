import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';

import {
  basketSummary,
  getMerchant,
  merchants,
  sanitiseBasket,
  searchMerchants,
  sameMerchantBasket,
} from '../src/features/merchants/catalog';
import {
  isDeliveryRequest,
  previewEstimate,
  validateRequest,
  type DeliveryRequest,
} from '../src/features/delivery/model';

test('directories search business names and products within the selected service and category', () => {
  assert.equal(searchMerchants('restaurant').length, 3);
  assert.equal(searchMerchants('shop').length, 3);
  assert.deepEqual(
    searchMerchants('restaurant', '  MANGO  ').map((m) => m.id),
    ['mango-kitchen'],
  );
  assert.deepEqual(
    searchMerchants('restaurant', 'coffee', 'Café').map((m) => m.id),
    ['bun-and-brew'],
  );
  assert.deepEqual(searchMerchants('shop', 'chicken'), []);
  assert.equal(getMerchant('daily-market', 'restaurant'), undefined);
  assert.equal(getMerchant(['daily-market']), undefined);
});

test('basket counts and subtotals allow more than 20 units of an available product', () => {
  const merchant = getMerchant('mango-kitchen')!;
  const quantities = {
    'mango-burger': 21,
    'mango-coffee': 1,
    'bun-burger': 3,
    'mango-bowl': 21,
    'mango-chicken': -1,
  };
  assert.deepEqual(sanitiseBasket(merchant, quantities), {
    'mango-burger': 21,
    'mango-coffee': 1,
  });
  assert.deepEqual(basketSummary(merchant, quantities), {
    count: 22,
    subtotal: 117500,
  });
  assert.deepEqual(basketSummary(merchant, { 'mango-burger': 0.5 }), {
    count: 0,
    subtotal: 0,
  });
});

test('changing basket quantities invalidates a previously confirmed preview', () => {
  const merchant = getMerchant('mango-kitchen')!;
  const original = { 'mango-chicken': 2 };
  assert.equal(sameMerchantBasket(merchant, original, { ...original }), true);
  assert.equal(
    sameMerchantBasket(merchant, original, { 'mango-chicken': 1 }),
    false,
  );
  assert.equal(sameMerchantBasket(merchant, original, {}), false);
  assert.equal(
    sameMerchantBasket(merchant, original, { ...original, 'mango-bowl': 1 }),
    false,
  );
});

test('out-of-stock items stay readable in saved requests but cannot be added to a basket', () => {
  const merchant = getMerchant('mango-kitchen')!;
  const quantities = { 'mango-bowl': 1, 'mango-burger': 1 };
  const request: DeliveryRequest = {
    id: 'saved-before-stock-change',
    service: 'restaurant',
    merchantId: merchant.id,
    pickup: merchant.name,
    destination: 'Sample delivery address',
    description: '',
    method: 'pickup',
    size: 'Small',
    notes: '',
    quantities,
    createdAt: '2026-11-08T12:00:00Z',
    previewConfirmed: false,
  };

  assert.ok(isDeliveryRequest(request));
  assert.match(validateRequest(request).items, /available stock/);
  assert.deepEqual(sanitiseBasket(merchant, quantities), { 'mango-burger': 1 });
  assert.deepEqual(basketSummary(merchant, quantities), {
    count: 1,
    subtotal: 5500,
  });
});

test('shop baskets use each product’s stock and stale drafts must be corrected', () => {
  const merchant = getMerchant('daily-market')!;
  const quantities = {
    'daily-produce': 9,
    'daily-pantry': 32,
    'daily-bread': 1,
  };
  const available = { 'daily-produce': 8, 'daily-pantry': 32 };
  const request: DeliveryRequest = {
    id: 'shop-stock-preview',
    service: 'shop',
    merchantId: merchant.id,
    pickup: merchant.name,
    destination: 'Sample delivery address',
    description: '',
    method: 'pickup',
    size: 'Small',
    notes: '',
    quantities,
    createdAt: '2026-11-08T12:00:00Z',
    previewConfirmed: false,
  };

  assert.deepEqual(sanitiseBasket(merchant, quantities), available);
  assert.deepEqual(basketSummary(merchant, quantities), {
    count: 40,
    subtotal: 440000,
  });
  assert.ok(isDeliveryRequest(request));
  assert.match(validateRequest(request).items, /available stock/);
  assert.deepEqual(validateRequest({ ...request, quantities: available }), {});
});

test('business and product IDs are unique and every photo is bundled', () => {
  assert.equal(
    new Set(merchants.map((merchant) => merchant.id)).size,
    merchants.length,
  );
  const ids = merchants.flatMap((merchant) =>
    merchant.products.map((item) => item.id),
  );
  assert.equal(new Set(ids).size, ids.length);
  for (const merchant of merchants) {
    for (const key of [
      merchant.cover,
      ...merchant.products.map((item) => item.imageKey),
    ]) {
      assert.ok(
        key && existsSync(`assets/catalog/${key}.jpg`),
        `Missing image: ${key}`,
      );
    }
  }
});

test('a saved merchant request retains correct prices and rejects another business’s items', () => {
  const request: DeliveryRequest = {
    id: 'merchant-request',
    service: 'restaurant',
    merchantId: 'mango-kitchen',
    pickup: 'Mango Kitchen',
    destination: 'Sample delivery address',
    description: '',
    method: 'pickup',
    size: 'Small',
    notes: '',
    quantities: { 'mango-chicken': 21 },
    createdAt: '2026-11-08T12:00:00Z',
    previewConfirmed: false,
  };
  assert.equal(isDeliveryRequest(JSON.parse(JSON.stringify(request))), true);
  assert.deepEqual(validateRequest(request), {});
  assert.equal(previewEstimate(request).subtotal, 136500);
  assert.equal(previewEstimate(request).total, 138500);
  assert.equal(
    isDeliveryRequest({ ...request, merchantId: 'daily-market' }),
    false,
  );
  assert.equal(isDeliveryRequest({ ...request, merchantId: 'unknown' }), false);
  const mixed = {
    ...request,
    quantities: { ...request.quantities, 'bun-burger': 1 },
  };
  assert.equal(isDeliveryRequest(mixed), false);
  assert.ok(validateRequest(mixed).items);
});
