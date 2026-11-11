import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, EmptyState, Footer } from '../../../components/ui/primitives';
import { Text } from '../../../components/ui/Text';
import { formatMoney } from '../../../features/delivery/services';
import { useRestaurantWorkspace } from '../../../features/restaurant-workspace/RestaurantWorkspaceProvider';
import {
  orderStatusLabels,
  orderSubtotal,
} from '../../../features/restaurant-workspace/model';
import {
  RestaurantIntro,
  RestaurantPage,
  RestaurantRow,
  RestaurantTag,
} from '../../../features/restaurant-workspace/ui';
import { Pressable } from 'react-native';

const filters = ['All', 'New', 'In progress', 'History'] as const;

export default function RestaurantOrders() {
  const { workspace } = useRestaurantWorkspace();
  const { filter: initialFilter } = useLocalSearchParams<{ filter?: string }>();
  const [filter, setFilter] = useState<(typeof filters)[number]>(
    initialFilter === 'new'
      ? 'New'
      : initialFilter === 'in-progress'
        ? 'In progress'
        : 'All',
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
    <RestaurantPage title="Orders">
      <RestaurantIntro
        eyebrow="FULFILMENT"
        title="Order queue"
        description="Check new orders, confirm, and prepare each one for driver pickup."
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
          <RestaurantRow
            key={order.id}
            title={order.id}
            description={`${order.customer} · ${formatMoney(orderSubtotal(order))}`}
            icon="food"
            onPress={() =>
              router.push({
                pathname: '/restaurant-workspace/orders/[id]',
                params: { id: order.id },
              })
            }
          >
            <RestaurantTag
              label={orderStatusLabels[order.status]}
              tone={
                order.status === 'pending'
                  ? 'warning'
                  : order.status === 'ready'
                    ? 'success'
                    : 'neutral'
              }
            />
          </RestaurantRow>
        ))}
        {!orders.length && (
          <EmptyState
            icon="activity"
            title="No orders here"
            description="Orders in this stage will appear in this list."
          />
        )}
      </View>
    </RestaurantPage>
  );
}
