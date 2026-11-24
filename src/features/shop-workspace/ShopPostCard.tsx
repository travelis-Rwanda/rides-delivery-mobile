import type { PropsWithChildren } from 'react';
import { View } from 'react-native';

import { Text } from '../../components/ui/Text';
import { formatMoney } from '../delivery/services';
import type { ShopProduct } from './model';
import type { ShopPost } from './posts';
import { ShopPhoto } from './ShopPhoto';
import { ShopTag } from './ui';

export function ShopPostCard({
  post,
  product,
  shopName,
  showStatus = false,
  imageUri,
  children,
}: PropsWithChildren<{
  post: ShopPost;
  product?: ShopProduct;
  shopName: string;
  showStatus?: boolean;
  imageUri?: string;
}>) {
  const photoKey = imageUri ? undefined : (post.photoKey ?? product?.photoKey);
  const hasPhoto = !!(
    photoKey ||
    imageUri ||
    product?.imageKey ||
    product?.imageUrl
  );
  return (
    <View className="overflow-hidden rounded-[22px] border border-border bg-card">
      <View className="gap-3 p-4">
        <View className="flex-row flex-wrap items-center justify-between gap-2">
          <Text className="flex-1 text-sm font-medium text-foreground">
            {shopName}
          </Text>
          {showStatus && (
            <ShopTag
              label={post.status === 'published' ? 'Published' : 'Draft'}
              tone={post.status === 'published' ? 'success' : 'neutral'}
            />
          )}
        </View>
        <Text className="text-xs text-muted-foreground">
          {post.kind === 'product' ? 'Product highlight' : 'Promotion'}
          {' · '}
          {new Date(post.updatedAt).toLocaleDateString('en-GB', {
            timeZone: 'Africa/Kigali',
            day: 'numeric',
            month: 'short',
          })}
        </Text>
      </View>
      {hasPhoto && (
        <ShopPhoto
          photoKey={photoKey}
          imageKey={product?.imageKey}
          imageUri={imageUri ?? product?.imageUrl}
          label={post.title || 'Post photo'}
          style={{ height: 190 }}
        />
      )}
      <View className="gap-3 p-4">
        <Text
          accessibilityRole="header"
          className="text-lg font-medium leading-6 text-foreground"
        >
          {post.title || 'Your post title'}
        </Text>
        <Text className="text-sm leading-6 text-muted-foreground">
          {post.body || 'Your post description will appear here.'}
        </Text>
        {product && (
          <View className="gap-2 rounded-xl bg-background p-3">
            <View className="flex-row flex-wrap justify-between gap-2">
              <Text className="flex-1 text-sm font-medium text-foreground">
                {product.name}
              </Text>
              <Text className="text-sm font-medium text-primary">
                {formatMoney(product.price)}
              </Text>
            </View>
            {product.available === false && <ShopTag label="Unavailable" />}
          </View>
        )}
        {post.productId && !product && (
          <ShopTag label="Linked product was removed" tone="warning" />
        )}
        {children}
      </View>
    </View>
  );
}
