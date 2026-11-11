import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from '../../components/ui/Icon';
import { Button, EmptyState, Footer } from '../../components/ui/primitives';
import { ScrollPressable } from '../../components/ui/ScrollInteraction';
import { Text } from '../../components/ui/Text';
import { formatMoney } from '../../features/delivery/services';
import { useRestaurantWorkspace } from '../../features/restaurant-workspace/RestaurantWorkspaceProvider';
import { RestaurantPhoto } from '../../features/restaurant-workspace/RestaurantPhoto';
import {
  RestaurantField,
  RestaurantIntro,
  RestaurantPage,
} from '../../features/restaurant-workspace/ui';
import { usePalette } from '../../hooks/usePalette';

export default function RestaurantMenu() {
  const { workspace } = useRestaurantWorkspace();
  const palette = usePalette();
  const [query, setQuery] = useState('');
  const items =
    workspace?.menu.filter((item) =>
      `${item.name} ${item.category}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
    ) ?? [];

  return (
    <RestaurantPage
      title="Menu"
      footer={
        <Footer>
          <Button
            label="Add item"
            icon="plus"
            onPress={() => router.push('/restaurant-workspace/item/new')}
          />
        </Footer>
      }
    >
      <RestaurantIntro
        eyebrow="RESTAURANT MENU"
        title="Your items"
        description="Find an item to update its photo, price, or details."
      />
      <View className="mb-4 gap-3">
        <RestaurantField
          label="Search menu"
          placeholder="Search by name or category"
          value={query}
          onChangeText={setQuery}
        />
      </View>
      <Text className="mb-3 text-xs text-muted-foreground">
        {items.length} {items.length === 1 ? 'item' : 'items'}
      </Text>
      <View className="gap-3">
        {items.map((item) => (
          <View
            key={item.id}
            className="flex-row items-center gap-3 rounded-[20px] border border-border bg-card p-3"
          >
            <RestaurantPhoto
              photoKey={item.photoKey}
              imageKey={item.imageKey}
              label={item.name}
              style={{ width: 70, height: 76, borderRadius: 13 }}
            />
            <ScrollPressable
              accessibilityRole="button"
              accessibilityLabel={`Edit ${item.name}`}
              onPress={() =>
                router.push({
                  pathname: '/restaurant-workspace/item/[id]',
                  params: { id: item.id },
                })
              }
              className="min-h-[76px] flex-1 flex-row items-center gap-2"
            >
              <View className="flex-1 gap-1.5">
                <Text className="text-[10px] text-muted-foreground">
                  {item.category}
                </Text>
                <Text className="text-sm font-medium leading-5 text-foreground">
                  {item.name}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {formatMoney(item.price)}
                </Text>
                {item.variants.length > 0 && (
                  <Text className="text-xs text-muted-foreground">
                    {item.variants.length}{' '}
                    {item.variants.length === 1 ? 'variation' : 'variations'}
                  </Text>
                )}
              </View>
              <Icon
                name="chevron"
                size={16}
                color={palette['muted-foreground']}
              />
            </ScrollPressable>
          </View>
        ))}
        {!items.length && (
          <EmptyState
            icon="food"
            title="No items found"
            description="Try another search or add a new menu item."
          />
        )}
      </View>
    </RestaurantPage>
  );
}
