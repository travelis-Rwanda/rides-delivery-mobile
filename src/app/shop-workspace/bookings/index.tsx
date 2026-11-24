import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Button, EmptyState } from '../../../components/ui/primitives';
import { ScrollPressable } from '../../../components/ui/ScrollInteraction';
import { Text } from '../../../components/ui/Text';
import { useDelivery } from '../../../features/delivery/DeliveryProvider';
import { isPastShopBooking } from '../../../features/delivery/shopTracking';
import { ShopPage, ShopRow } from '../../../features/shop-workspace/ui';
import {
  BookingStatus,
  formatBookingDate,
  shopBookingRole,
} from '../../../features/shop-workspace/bookingUI';
import { usePalette } from '../../../hooks/usePalette';

const filters = ['All', 'Open', 'History'] as const;
const emptyTitles = {
  All: 'No transport bookings yet',
  Open: 'No open bookings',
  History: 'No past bookings',
};

export default function ShopBookingsScreen() {
  const { requests, loading, loadError, reload } = useDelivery();
  const [filter, setFilter] = useState<(typeof filters)[number]>('All');
  const palette = usePalette();
  const bookings = requests
    .filter(
      (request) =>
        request.bookingSource === 'shop' &&
        (filter === 'All' ||
          isPastShopBooking(request) === (filter === 'History')),
    )
    .map((request) => ({
      request,
      updatedAt: request.shopTracking?.at(-1)?.at ?? request.createdAt,
    }))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));

  return (
    <ShopPage title="Transport bookings">
      {loading ? (
        <ActivityIndicator
          color={palette.primary}
          accessibilityLabel="Loading bookings"
        />
      ) : loadError ? (
        <EmptyState
          title="Couldn’t load bookings"
          description="Try loading your saved transport bookings again."
        >
          <Button label="Try again" onPress={() => void reload()} />
        </EmptyState>
      ) : (
        <View className="gap-4">
          <View className="flex-row gap-1 rounded-2xl bg-muted p-1">
            {filters.map((option) => (
              <ScrollPressable
                key={option}
                accessibilityRole="tab"
                accessibilityState={{ selected: option === filter }}
                className={`min-h-11 flex-1 items-center justify-center rounded-xl px-1 ${option === filter ? 'bg-card' : ''}`}
                onPress={() => setFilter(option)}
              >
                <Text
                  className={`text-sm font-medium ${option === filter ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  {option}
                </Text>
              </ScrollPressable>
            ))}
          </View>
          {bookings.length ? (
            bookings.map(({ request, updatedAt }) => (
              <ShopRow
                key={request.id}
                title={request.description || shopBookingRole(request)}
                description={`${shopBookingRole(request)} · ${formatBookingDate(updatedAt)}\n${request.pickup} → ${request.destination}`}
                icon="parcel"
                onPress={() =>
                  router.push({
                    pathname: '/shop-workspace/bookings/[id]',
                    params: { id: request.id },
                  })
                }
              >
                <BookingStatus request={request} />
              </ShopRow>
            ))
          ) : (
            <EmptyState
              title={emptyTitles[filter]}
              description={
                filter === 'History'
                  ? 'Completed and cancelled bookings will appear here.'
                  : 'Book transport to send or receive a parcel from your shop.'
              }
            />
          )}
          <Button
            label="Book transport"
            icon="plus"
            secondary={bookings.length > 0}
            onPress={() => router.push('/shop-workspace/transport')}
          />
        </View>
      )}
    </ShopPage>
  );
}
