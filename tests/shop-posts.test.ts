import assert from 'node:assert/strict';
import { test } from 'node:test';

import { deleteProduct } from '../src/features/shop-workspace/model';
import {
  deleteShopPost,
  isShopPost,
  publishedShopPosts,
  saveShopPost,
  validateShopPost,
  type ShopPost,
} from '../src/features/shop-workspace/posts';
import { makeSampleWorkspace } from '../src/features/shop-workspace/sample';

function post(input: Partial<ShopPost> = {}): ShopPost {
  return {
    id: 'post-1',
    kind: 'product',
    title: 'Fresh picks',
    body: 'Discover this week’s fresh produce.',
    productId: 'daily-produce',
    status: 'draft',
    createdAt: '2026-11-24T10:00:00Z',
    updatedAt: '2026-11-24T10:00:00Z',
    ...input,
  };
}

test('older shop archives accept their first post without replacing products or orders', () => {
  const initial = makeSampleWorkspace();
  delete initial.posts;
  const next = saveShopPost(initial, post({ title: ' Fresh picks ' }));
  assert.equal(next.posts.length, 1);
  assert.equal(next.posts[0].title, 'Fresh picks');
  assert.equal(next.products, initial.products);
  assert.equal(next.orders, initial.orders);
  assert.deepEqual(publishedShopPosts(next), []);
  assert.equal(initial.posts, undefined);
});

test('publishing requires content and valid product links while promotions can be shop-wide', () => {
  const initial = makeSampleWorkspace();
  assert.ok(validateShopPost(post({ title: '' }), initial.products).title);
  assert.ok(
    validateShopPost(post({ title: 'x'.repeat(81) }), initial.products).title,
  );
  assert.ok(
    validateShopPost(post({ body: 'x'.repeat(1001) }), initial.products).body,
  );
  assert.throws(
    () => saveShopPost(initial, post({ status: 'published', body: ' ' })),
    /description/,
  );
  assert.throws(
    () =>
      saveShopPost(
        initial,
        post({ status: 'published', productId: undefined }),
      ),
    /product/,
  );
  assert.throws(
    () =>
      saveShopPost(
        initial,
        post({ status: 'published', productId: 'removed' }),
      ),
    /product/,
  );
  const promotion = post({
    kind: 'promotion',
    productId: undefined,
    status: 'published',
  });
  assert.equal(publishedShopPosts(saveShopPost(initial, promotion)).length, 1);
});

test('editing and unpublishing keep the same post and its original creation date', () => {
  const initial = saveShopPost(
    makeSampleWorkspace(),
    post({ status: 'published' }),
  );
  assert.equal(publishedShopPosts(initial).length, 1);
  const edited = saveShopPost(
    initial,
    post({
      title: 'Updated offer',
      createdAt: '2026-11-25T10:00:00Z',
      status: 'draft',
    }),
  );
  assert.equal(edited.posts.length, 1);
  assert.equal(edited.posts[0].createdAt, initial.posts[0].createdAt);
  assert.equal(edited.posts[0].title, 'Updated offer');
  assert.equal(publishedShopPosts(edited).length, 0);
});

test('deleting a product returns linked adverts to drafts and deleting a post preserves shop data', () => {
  const initial = saveShopPost(
    makeSampleWorkspace(),
    post({ status: 'published' }),
  );
  const removedProduct = deleteProduct(initial, 'daily-produce');
  assert.equal(removedProduct.posts?.[0].status, 'draft');
  assert.equal(publishedShopPosts(removedProduct).length, 0);
  assert.equal(removedProduct.orders, initial.orders);
  const removedPost = deleteShopPost(initial, 'post-1');
  assert.deepEqual(removedPost.posts, []);
  assert.equal(removedPost.products, initial.products);
  assert.equal(removedPost.orders, initial.orders);
  assert.deepEqual(deleteShopPost(removedPost, 'post-1').posts, []);
});

test('post archives reject malformed media references, statuses, and timestamps', () => {
  assert.equal(isShopPost(JSON.parse(JSON.stringify(post()))), true);
  assert.equal(isShopPost({ ...post(), status: 'unknown' }), false);
  assert.equal(isShopPost({ ...post(), updatedAt: 'yesterday' }), false);
  assert.equal(isShopPost({ ...post(), photoKey: '../photo.png' }), false);
  assert.equal(isShopPost({ ...post(), productId: 42 }), false);
});
