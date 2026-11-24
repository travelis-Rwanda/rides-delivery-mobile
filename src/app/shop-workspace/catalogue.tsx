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

const filters = [
  'All products',
  'Available',
  'Unavailable',
  'In stock',
  'Out of stock',
] as const;

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
      const available = product.available !== false;
      return (
        matches &&
        (filter === 'All products' ||
          (filter === 'Available' && available) ||
          (filter === 'Unavailable' && !available) ||
          (filter === 'In stock' && inStock) ||
          (filter === 'Out of stock' && !inStock))
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
        description="View product details, stock, and availability. Open a product to change its status, edit, or delete it."
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
          const available = product.available !== false;
          return (
            <View
              key={product.id}
              className="gap-3 rounded-[20px] border border-border bg-card p-3"
            >
              <View className="flex-row items-center gap-3">
                <ShopPhoto
                  photoKey={product.photoKey}
                  imageKey={product.imageKey}
                  imageUri={product.imageUrl}
                  label={product.name}
                  style={{ width: 70, height: 76, borderRadius: 13 }}
                />
                <ScrollPressable
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${product.name}, ${available ? 'available' : 'unavailable'}, ${stock} in stock`}
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
                    <View className="flex-row flex-wrap gap-1.5">
                      <ShopTag
                        label={available ? 'Available' : 'Unavailable'}
                        tone={available ? 'success' : 'neutral'}
                      />
                      <ShopTag
                        label={stock === 0 ? 'Out of stock' : `${stock} in stock`}
                        tone={stock > 0 ? 'neutral' : 'warning'}
                      />
                    </View>
                  </View>
                  <Icon
                    name="chevron"
                    size={16}
                    color={palette['muted-foreground']}
                  />
                </ScrollPressable>
              </View>
            </View>
          );
        })}
        {!products.length && (
          <EmptyState
            icon="shop"
            title="No products found"
            description="Try another search or filter, or add a new product."
          />
        )}
      </View>
    </ShopPage>
  );
}
