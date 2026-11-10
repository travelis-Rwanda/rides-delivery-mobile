import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { EmptyState } from '../../../components/ui/primitives';
import { Text } from '../../../components/ui/Text';
import { formatMoney } from '../../../features/delivery/services';
import { useShopWorkspace } from '../../../features/shop-workspace/ShopWorkspaceProvider';
import {
  orderStatusLabels,
  orderSubtotal,
} from '../../../features/shop-workspace/model';
import {
  ShopIntro,
  ShopPage,
  ShopRow,
  ShopTag,
} from '../../../features/shop-workspace/ui';

const filters = ['All', 'New', 'In progress', 'History'] as const;

export default function ShopOrders() {
  const { workspace } = useShopWorkspace();
  const { filter: initialFilter } = useLocalSearchParams<{ filter?: string }>();
  const [filter, setFilter] = useState<(typeof filters)[number]>(
    initialFilter === 'new' ? 'New' : 'All',
  );
  const orders =
    workspace?.orders.filter((order) => {
      const isHistory =
        order.status === 'completed' || order.status === 'rejected';
      if (filter === 'New') return order.status === 'pending';
      if (filter === 'In progress')
        return !isHistory && order.status !== 'pending';
      if (filter === 'History') return isHistory;
      return true;
    }) ?? [];

  return (
    <ShopPage title="Shop orders">
      <ShopIntro
        eyebrow="FULFILMENT"
        title="Order queue"
        description="Check new orders, prepare accepted items, and see what is ready for pickup."
      />
      <View className="mb-4 flex-row flex-wrap gap-2">
        {filters.map((entry) => (
          <Pressable
            key={entry}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === entry }}
            onPress={() => setFilter(entry)}
            className={`min-h-11 justify-center rounded-full border px-4 ${filter === entry ? 'border-primary bg-secondary' : 'border-border bg-card'}`}
          >
            <Text
              className={`text-xs font-medium ${filter === entry ? 'text-primary' : 'text-foreground'}`}
            >
              {entry}
            </Text>
          </Pressable>
        ))}
      </View>
      <View className="gap-3">
        {orders.map((order) => (
          <ShopRow
            key={order.id}
            title={order.id}
            description={`${order.customer} · ${formatMoney(orderSubtotal(order))}`}
            icon="parcel"
            onPress={() =>
              router.push({
                pathname: '/shop-workspace/orders/[id]',
                params: { id: order.id },
              })
            }
          >
            <ShopTag
              label={orderStatusLabels[order.status]}
              tone={
                order.status === 'pending'
                  ? 'warning'
                  : order.status === 'ready'
                    ? 'success'
                    : 'neutral'
              }
            />
          </ShopRow>
        ))}
        {!orders.length && (
          <EmptyState
            icon="activity"
            title="No orders here"
            description="Orders in this stage will appear in this list."
          />
        )}
      </View>
    </ShopPage>
  );
}
