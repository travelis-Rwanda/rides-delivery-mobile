import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  advanceOrder,
  rejectOrder,
  unavailableOrderLines,
} from '../src/features/shop-workspace/model';
import { makeSampleWorkspace } from '../src/features/shop-workspace/sample';

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
