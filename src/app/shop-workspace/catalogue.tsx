import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from '../../components/ui/Icon';
import { Button, EmptyState, Footer } from '../../components/ui/primitives';
import { ScrollPressable } from '../../components/ui/ScrollInteraction';
import { Text } from '../../components/ui/Text';
import { formatMoney } from '../../features/delivery/services';
import { useShopWorkspace } from '../../features/shop-workspace/ShopWorkspaceProvider';
import { totalStock } from '../../features/shop-workspace/model';
import { ShopPhoto } from '../../features/shop-workspace/ShopPhoto';
import {
  ShopField,
  ShopIntro,
  ShopPage,
  ShopTag,
} from '../../features/shop-workspace/ui';
import { usePalette } from '../../hooks/usePalette';

const filters = ['All products', 'In stock', 'Out of stock'] as const;

export default function ShopCatalogue() {
  const { workspace } = useShopWorkspace();
  const { filter: initialFilter } = useLocalSearchParams<{ filter?: string }>();
  const palette = usePalette();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof filters)[number]>(
    initialFilter === 'out-of-stock' ? 'Out of stock' : 'All products',
  );
  const products =
    workspace?.products.filter((product) => {
      const matches = `${product.name} ${product.category}`
        .toLowerCase()
        .includes(query.trim().toLowerCase());
      const inStock = totalStock(product) > 0;
      return (
        matches &&
        (filter === 'All products' || inStock === (filter === 'In stock'))
      );
    }) ?? [];

  return (
    <ShopPage
      title="Catalogue & inventory"
      footer={
        <Footer>
          <Button
            label="Add product"
            icon="plus"
            onPress={() => router.push('/shop-workspace/product/new')}
          />
        </Footer>
      }
    >
      <ShopIntro
        eyebrow="SHOP INVENTORY"
        title="Your products"
        description="Find an item to update its photo, price, or stock."
      />
      <View className="mb-4 gap-3">
        <ShopField
          label="Search products"
          placeholder="Search by name or category"
          value={query}
          onChangeText={setQuery}
        />
        <View className="flex-row flex-wrap gap-2">
          {filters.map((item) => (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === item }}
              onPress={() => setFilter(item)}
              className={`min-h-11 justify-center rounded-full border px-3.5 ${filter === item ? 'border-primary bg-secondary' : 'border-border bg-card'}`}
            >
              <Text
                className={`text-xs font-medium ${filter === item ? 'text-primary' : 'text-foreground'}`}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Text className="mb-3 text-xs text-muted-foreground">
        {products.length} {products.length === 1 ? 'product' : 'products'}
      </Text>
      <View className="gap-3">
        {products.map((product) => {
          const stock = totalStock(product);
          return (
            <View
              key={product.id}
              className="flex-row items-center gap-3 rounded-[20px] border border-border bg-card p-3"
            >
              <ShopPhoto
                photoKey={product.photoKey}
                imageKey={product.imageKey}
                imageUri={product.imageUrl}
                label={product.name}
                style={{ width: 70, height: 76, borderRadius: 13 }}
              />
              <ScrollPressable
                accessibilityRole="button"
                accessibilityLabel={`Edit ${product.name}, ${stock} in stock`}
                onPress={() =>
                  router.push({
                    pathname: '/shop-workspace/product/[id]',
                    params: { id: product.id },
                  })
                }
                className="min-h-[76px] flex-1 flex-row items-center gap-2"
              >
                <View className="flex-1 gap-1.5">
                  <Text className="text-[10px] text-muted-foreground">
                    {product.category}
                  </Text>
                  <Text className="text-sm font-medium leading-5 text-foreground">
                    {product.name}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {formatMoney(product.price)}
                  </Text>
                  <ShopTag
                    label={stock === 0 ? 'Out of stock' : `${stock} in stock`}
                    tone={stock > 0 ? 'success' : 'warning'}
                  />
                </View>
                <Icon
                  name="chevron"
                  size={16}
                  color={palette['muted-foreground']}
                />
              </ScrollPressable>
            </View>
          );
        })}
        {!products.length && (
          <EmptyState
            icon="shop"
            title="No products found"
            description="Try another search or switch the stock filter."
          />
        )}
      </View>
    </ShopPage>
  );
}
