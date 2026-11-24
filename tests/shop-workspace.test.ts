import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  advanceOrder,
  deleteProduct,
  rejectOrder,
  unavailableOrderLines,
} from '../src/features/shop-workspace/model';
import { makeSampleWorkspace } from '../src/features/shop-workspace/sample';
import { shopTransportDefaults } from '../src/features/shop-workspace/transport';

test('shop transport prefills only the shop side and skips non-mobile contacts', () => {
  const application = {
    name: 'Daily Market',
    category: 'Groceries',
    contact: '0788 123 456',
    pickupAddress: 'KG 10 Ave',
    pickupPoint: { latitude: -1.95, longitude: 30.08 },
  };
  assert.deepEqual(shopTransportDefaults('send', application), {
    pickup: application.pickupAddress,
    pickupPoint: application.pickupPoint,
    pickupContact: { name: application.name, phone: '+250788123456' },
  });
  assert.deepEqual(
    shopTransportDefaults('receive', {
      ...application,
      contact: 'shop@example.com',
    }),
    {
      destination: application.pickupAddress,
      destinationPoint: application.pickupPoint,
      receiverContact: { name: application.name, phone: '' },
    },
  );
  assert.equal(shopTransportDefaults('send').pickupContact, undefined);
});

test('shop confirmation reserves stock once and only the merchant stages can advance', () => {
  const initial = makeSampleWorkspace();
  const confirmed = advanceOrder(initial, 'SHOP-1042');
  const preparing = advanceOrder(confirmed, 'SHOP-1042');
  const ready = advanceOrder(preparing, 'SHOP-1042');
  assert.equal(confirmed.orders[0].status, 'confirmed');
  assert.equal(ready.orders[0].status, 'ready');
  assert.equal(ready.products[0].stock, initial.products[0].stock - 2);
  assert.equal(ready.products[1].stock, initial.products[1].stock - 1);
  assert.equal(ready.products, confirmed.products);
  assert.throws(() => advanceOrder(ready, 'SHOP-1042'), /another stage/);
  assert.throws(
    () => rejectOrder(confirmed, 'SHOP-1042', 'Unavailable'),
    /awaiting confirmation/,
  );
});

test('legacy products stay available and disabling a stocked product blocks new confirmation', () => {
  const initial = makeSampleWorkspace();
  const product = initial.products[0];
  delete product.available;
  assert.equal(
    unavailableOrderLines(initial.orders[0], initial.products).length,
    0,
  );

  const disabled = structuredClone(initial);
  disabled.products[0].available = false;
  assert.equal(disabled.products[0].stock, product.stock);
  assert.equal(disabled.products[0].available, false);
  assert.equal(
    unavailableOrderLines(disabled.orders[0], disabled.products).length,
    1,
  );
  assert.throws(() => advanceOrder(disabled, initial.orders[0].id), /availability/);
  assert.equal(initial.products[0].available, undefined);

  const restored = structuredClone(disabled);
  restored.products[0].available = true;
  const confirmed = advanceOrder(restored, initial.orders[0].id);
  assert.equal(confirmed.products[0].stock, product.stock - 2);
});

test('availability preserves variation stock and does not interrupt accepted orders', () => {
  const initial = makeSampleWorkspace();
  const product = initial.products[0];
  product.variants = [{ id: 'small', name: 'Small', stock: 4 }];
  initial.orders[0].lines[0].variantId = 'small';
  const confirmed = advanceOrder(initial, initial.orders[0].id);
  const disabled = structuredClone(confirmed);
  disabled.products[0].available = false;
  assert.deepEqual(disabled.products[0].variants, confirmed.products[0].variants);
  assert.equal(
    advanceOrder(disabled, initial.orders[0].id).orders[0].status,
    'preparing',
  );

  const restored = structuredClone(disabled);
  restored.products[0].available = true;
  assert.deepEqual(restored.products[0].variants, confirmed.products[0].variants);
});

test('deleting a product preserves order history and prevents confirming pending orders for it', () => {
  const initial = makeSampleWorkspace();
  const product = initial.products[0];
  const removed = deleteProduct(initial, product.id);

  assert.equal(removed.products.some((entry) => entry.id === product.id), false);
  assert.equal(initial.products.some((entry) => entry.id === product.id), true);
  assert.equal(removed.orders, initial.orders);
  assert.equal(removed.orders[0].lines[0].name, product.name);
  assert.equal(removed.orders[2].status, 'completed');
  assert.throws(() => advanceOrder(removed, initial.orders[0].id), /availability/);
  assert.deepEqual(deleteProduct(removed, product.id), removed);
});

test('pending orders check combined demand against the requested variation', () => {
  const workspace = makeSampleWorkspace();
  const product = workspace.products[0];
  product.variants = [
    { id: 'small', name: 'Small', stock: 3 },
    { id: 'large', name: 'Large', stock: 10 },
  ];
  const order = workspace.orders[0];
  const line = { ...order.lines[0], variantId: 'small' };
  order.lines = [line, { ...line }];

  assert.equal(unavailableOrderLines(order, workspace.products).length, 2);
  assert.throws(() => advanceOrder(workspace, order.id), /availability/);
  assert.throws(() => rejectOrder(workspace, order.id, ' '), /reason/);
  const rejected = rejectOrder(workspace, order.id, 'Not enough small baskets');
  assert.equal(rejected.orders[0].status, 'rejected');
  assert.equal(rejected.products, workspace.products);

  product.variants[0].stock = 4;
  const confirmed = advanceOrder(workspace, order.id);
  assert.deepEqual(
    confirmed.products[0].variants.map((variant) => variant.stock),
    [0, 10],
  );
});
