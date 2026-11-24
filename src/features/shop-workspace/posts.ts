import type { ShopProduct, ShopWorkspace } from './model';
import { validPhotoKey } from './photoAsset';

export type ShopPost = {
  id: string;
  kind: 'product' | 'promotion';
  title: string;
  body: string;
  productId?: string;
  photoKey?: string;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
};

export function isShopPost(value: unknown): value is ShopPost {
  if (!value || typeof value !== 'object') return false;
  const post = value as Record<string, unknown>;
  return (
    typeof post.id === 'string' &&
    !!post.id &&
    (post.kind === 'product' || post.kind === 'promotion') &&
    typeof post.title === 'string' &&
    typeof post.body === 'string' &&
    (post.productId === undefined || typeof post.productId === 'string') &&
    (post.photoKey === undefined ||
      (typeof post.photoKey === 'string' &&
        validPhotoKey.test(post.photoKey))) &&
    (post.status === 'draft' || post.status === 'published') &&
    typeof post.createdAt === 'string' &&
    Number.isFinite(Date.parse(post.createdAt)) &&
    typeof post.updatedAt === 'string' &&
    Number.isFinite(Date.parse(post.updatedAt))
  );
}

export function validateShopPost(post: ShopPost, products: ShopProduct[]) {
  const errors: Record<string, string> = {};
  if (!post.title.trim()) errors.title = 'Give your post a title.';
  else if (post.title.trim().length > 80)
    errors.title = 'Keep the title within 80 characters.';
  if (post.body.trim().length > 1000)
    errors.body = 'Keep the description within 1,000 characters.';
  if (post.status === 'published') {
    if (!post.body.trim()) errors.body = 'Add a description before publishing.';
    if (
      (post.kind === 'product' || post.productId) &&
      !products.some((product) => product.id === post.productId)
    )
      errors.product =
        'Choose a product from your catalogue before publishing.';
  }
  return errors;
}

export function saveShopPost(workspace: ShopWorkspace, post: ShopPost) {
  if (!isShopPost(post)) throw new Error('Please check your post details.');
  const errors = validateShopPost(post, workspace.products);
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
  const posts = workspace.posts ?? [];
  const existing = posts.find((entry) => entry.id === post.id);
  return {
    ...workspace,
    posts: [
      {
        ...post,
        title: post.title.trim(),
        body: post.body.trim(),
        createdAt: existing?.createdAt ?? post.createdAt,
      },
      ...posts.filter((entry) => entry.id !== post.id),
    ],
  };
}

export function deleteShopPost(workspace: ShopWorkspace, postId: string) {
  return {
    ...workspace,
    posts: (workspace.posts ?? []).filter((post) => post.id !== postId),
  };
}

export function publishedShopPosts(workspace: ShopWorkspace) {
  return (workspace.posts ?? []).filter(
    (post) =>
      post.status === 'published' &&
      (!post.productId ||
        workspace.products.some((product) => product.id === post.productId)),
  );
}
