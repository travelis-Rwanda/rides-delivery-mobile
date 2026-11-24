import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { ConfirmRemoveButton } from '../../../components/ui/ConfirmRemoveButton';
import { Button, EmptyState, Footer } from '../../../components/ui/primitives';
import { Text } from '../../../components/ui/Text';
import { ShopPostCard } from '../../../features/shop-workspace/ShopPostCard';
import { useShopWorkspace } from '../../../features/shop-workspace/ShopWorkspaceProvider';
import { deleteShopPhoto } from '../../../features/shop-workspace/photoStorage';
import {
  deleteShopPost,
  saveShopPost,
  validateShopPost,
  type ShopPost,
} from '../../../features/shop-workspace/posts';
import { sampleShop } from '../../../features/shop-workspace/sample';
import {
  ShopPhotoEditor,
  useShopPhotoDraft,
} from '../../../features/shop-workspace/ShopPhoto';
import {
  ShopField,
  ShopIntro,
  ShopPage,
  ShopPanel,
  ShopSection,
} from '../../../features/shop-workspace/ui';

export default function ShopPostRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { workspace } = useShopWorkspace();
  if (!workspace) return <ShopPage title="Post details" />;
  const post = workspace.posts?.find((entry) => entry.id === id);
  if (id !== 'new' && !post)
    return (
      <ShopPage title="Post unavailable">
        <EmptyState
          title="This post is no longer available"
          description="Return to your posts to create or edit an announcement."
        >
          <Button
            label="Back to posts"
            onPress={() => router.dismissTo('/shop-workspace/posts')}
          />
        </EmptyState>
      </ShopPage>
    );
  return <PostForm key={id} post={post} />;
}

function PostForm({ post }: { post?: ShopPost }) {
  const { workspace, update, saving } = useShopWorkspace();
  const photo = useShopPhotoDraft(post?.photoKey);
  const [draft, setDraft] = useState<ShopPost>(
    () =>
      post ?? {
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
        kind: 'product',
        title: '',
        body: '',
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [productQuery, setProductQuery] = useState('');
  const busy = saving || photo.saving;
  const products = workspace?.products ?? [];
  const product = products.find((entry) => entry.id === draft.productId);
  const choices = products.filter((entry) =>
    entry.name.toLowerCase().includes(productQuery.trim().toLowerCase()),
  );

  function change(patch: Partial<ShopPost>) {
    setDraft((current) => ({ ...current, ...patch }));
    setErrors({});
  }

  async function save(status: ShopPost['status']) {
    const next = { ...draft, status, updatedAt: new Date().toISOString() };
    const validation = validateShopPost(next, products);
    setErrors(validation);
    if (Object.keys(validation).length) return;
    const saved = await photo.save((photoKey) =>
      update((current) => saveShopPost(current, { ...next, photoKey })),
    );
    if (saved) router.dismissTo('/shop-workspace/posts');
  }

  async function remove() {
    if (!post) return;
    let photoKey: string | undefined;
    const saved = await update((current) => {
      photoKey = current.posts?.find((entry) => entry.id === post.id)?.photoKey;
      const next = deleteShopPost(current, post.id);
      if (
        next.application.photoKey === photoKey ||
        next.products.some((entry) => entry.photoKey === photoKey) ||
        next.posts.some((entry) => entry.photoKey === photoKey)
      )
        photoKey = undefined;
      return next;
    });
    if (!saved) return;
    if (photoKey) void deleteShopPhoto(photoKey).catch(() => {});
    router.dismissTo('/shop-workspace/posts');
  }

  return (
    <ShopPage
      title={post ? 'Edit post' : 'Create post'}
      footer={
        <Footer>
          <Button
            label={
              post?.status === 'published' ? 'Save & publish' : 'Publish post'
            }
            icon="promotion"
            disabled={busy}
            loading={busy}
            onPress={() => void save('published')}
          />
          <Button
            label="Save draft"
            secondary
            disabled={busy}
            onPress={() => void save('draft')}
          />
        </Footer>
      }
    >
      <ShopIntro
        eyebrow="POSTS & PROMOTIONS"
        title={post ? 'Make it your own.' : 'Give your shop a voice.'}
        description="Share a product or an offer with customers browsing your shop."
      />
      <View className="gap-5">
        <ShopPanel>
          <ShopSection icon="promotion" title="Post details" />
          <View className="flex-row gap-2">
            {(['product', 'promotion'] as const).map((kind) => (
              <Pressable
                key={kind}
                accessibilityRole="radio"
                accessibilityState={{ checked: draft.kind === kind }}
                disabled={busy}
                onPress={() => change({ kind })}
                className={`min-h-12 flex-1 items-center justify-center rounded-xl border px-3 ${draft.kind === kind ? 'border-primary bg-secondary' : 'border-border bg-card'}`}
              >
                <Text
                  className={`text-sm font-medium ${draft.kind === kind ? 'text-primary' : 'text-foreground'}`}
                >
                  {kind === 'product' ? 'Product highlight' : 'Promotion'}
                </Text>
              </Pressable>
            ))}
          </View>
          <ShopField
            label="Post title"
            placeholder="What would you like to share?"
            value={draft.title}
            maxLength={80}
            error={errors.title}
            editable={!busy}
            onChangeText={(title) => change({ title })}
          />
          <ShopField
            label="Description"
            placeholder={
              draft.kind === 'product'
                ? 'Tell customers what makes this product special.'
                : 'Describe your offer and any conditions.'
            }
            value={draft.body}
            multiline
            maxLength={1000}
            error={errors.body}
            editable={!busy}
            onChangeText={(body) => change({ body })}
          />
        </ShopPanel>
        <ShopPanel>
          <ShopSection
            icon="shop"
            title="Featured product"
            description={
              draft.kind === 'product'
                ? 'Choose the product you want to advertise.'
                : 'Link a product, or make this a shop-wide promotion.'
            }
          />
          <ShopField
            label="Find a product"
            placeholder="Search your catalogue"
            value={productQuery}
            onChangeText={setProductQuery}
            editable={!busy}
          />
          {draft.kind === 'promotion' && (
            <Button
              label="Shop-wide promotion"
              secondary
              icon={draft.productId ? null : 'check'}
              disabled={busy}
              onPress={() => change({ productId: undefined })}
            />
          )}
          {product && (
            <Text className="text-xs font-medium text-primary">
              Selected · {product.name}
            </Text>
          )}
          {choices.map((entry) => (
            <Pressable
              key={entry.id}
              accessibilityRole="radio"
              accessibilityLabel={`Feature ${entry.name}`}
              accessibilityState={{ checked: draft.productId === entry.id }}
              disabled={busy}
              onPress={() => change({ productId: entry.id })}
              className={`min-h-12 justify-center rounded-xl border p-3 ${draft.productId === entry.id ? 'border-primary bg-secondary' : 'border-border'}`}
            >
              <Text className="text-sm font-medium text-foreground">
                {entry.name}
              </Text>
              {entry.available === false && (
                <Text className="mt-1 text-xs text-muted-foreground">
                  Currently unavailable
                </Text>
              )}
            </Pressable>
          ))}
          {!choices.length && (
            <Text className="text-sm text-muted-foreground">
              No matching products. Try another search or add a product to your
              catalogue.
            </Text>
          )}
          {!!errors.product && (
            <Text
              accessibilityRole="alert"
              className="text-xs text-destructive"
            >
              {errors.product}
            </Text>
          )}
        </ShopPanel>
        <ShopPhotoEditor
          title="Post photo"
          description="Add an optional campaign image. Otherwise, the featured product’s photo is used."
          photoKey={post?.photoKey}
          draft={photo}
          disabled={busy}
        />
        <View className="gap-3">
          <Text
            accessibilityRole="header"
            className="text-lg font-medium text-foreground"
          >
            Post preview
          </Text>
          <ShopPostCard
            post={{
              ...draft,
              photoKey: photo.removed ? undefined : post?.photoKey,
            }}
            product={product}
            imageUri={photo.asset?.uri}
            shopName={workspace?.application.name || sampleShop.name}
          />
        </View>
        {post && (
          <ShopPanel>
            <ShopSection
              icon="minus"
              title="Delete post"
              description="Remove this announcement from your posts and shop page."
            />
            <ConfirmRemoveButton
              label="Delete post"
              description={`Delete “${post.title}”? This cannot be undone.`}
              disabled={busy}
              onConfirm={() => void remove()}
            />
          </ShopPanel>
        )}
      </View>
    </ShopPage>
  );
}
