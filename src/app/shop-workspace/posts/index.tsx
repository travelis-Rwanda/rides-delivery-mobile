import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, EmptyState, Footer } from '../../../components/ui/primitives';
import { Text } from '../../../components/ui/Text';
import { ShopPostCard } from '../../../features/shop-workspace/ShopPostCard';
import { useShopWorkspace } from '../../../features/shop-workspace/ShopWorkspaceProvider';
import { sampleShop } from '../../../features/shop-workspace/sample';
import { ShopIntro, ShopPage } from '../../../features/shop-workspace/ui';

const filters = ['All posts', 'Published', 'Drafts'] as const;

export default function ShopPosts() {
  const { workspace } = useShopWorkspace();
  const [filter, setFilter] = useState<(typeof filters)[number]>('All posts');
  const posts = (workspace?.posts ?? []).filter(
    (post) =>
      filter === 'All posts' ||
      post.status === (filter === 'Published' ? 'published' : 'draft'),
  );
  return (
    <ShopPage
      title="Posts & promotions"
      footer={
        <Footer>
          <Button
            label="Create post"
            icon="plus"
            onPress={() => router.push('/shop-workspace/posts/new')}
          />
        </Footer>
      }
    >
      <ShopIntro
        eyebrow="GROW YOUR SHOP"
        title="Share something good."
        description="Highlight products and announce promotions. Published posts appear on your shop page."
      />
      <View className="mb-5">
        <Button
          label="View shop page"
          icon="shop"
          secondary
          onPress={() =>
            router.push({
              pathname: '/merchant/[id]',
              params: { id: sampleShop.id },
            })
          }
        />
      </View>
      <View className="mb-5 flex-row flex-wrap gap-2">
        {filters.map((item) => (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === item }}
            onPress={() => setFilter(item)}
            className={`min-h-11 justify-center rounded-full border px-4 ${filter === item ? 'border-primary bg-secondary' : 'border-border bg-card'}`}
          >
            <Text
              className={`text-xs font-medium ${filter === item ? 'text-primary' : 'text-foreground'}`}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </View>
      <View className="gap-4">
        {posts.map((post) => (
          <ShopPostCard
            key={post.id}
            post={post}
            product={workspace?.products.find(
              (product) => product.id === post.productId,
            )}
            shopName={workspace?.application.name || sampleShop.name}
            showStatus
          >
            <Button
              label="Edit post"
              icon="edit"
              secondary
              onPress={() =>
                router.push({
                  pathname: '/shop-workspace/posts/[id]',
                  params: { id: post.id },
                })
              }
            />
          </ShopPostCard>
        ))}
        {!posts.length && (
          <EmptyState
            icon="promotion"
            title={
              filter === 'All posts'
                ? 'Your next announcement starts here'
                : `No ${filter.toLowerCase()} yet`
            }
            description="Create a product highlight or share an offer. Save it as a draft until you are ready to publish."
          />
        )}
      </View>
    </ShopPage>
  );
}
