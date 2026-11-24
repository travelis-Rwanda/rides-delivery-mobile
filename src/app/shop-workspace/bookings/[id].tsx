import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Icon } from '../../../components/ui/Icon';
import { Button, EmptyState, Notice } from '../../../components/ui/primitives';
import { Text } from '../../../components/ui/Text';
import { CancelRequest } from '../../../features/delivery/components/CancelRequest';
import { useDelivery } from '../../../features/delivery/DeliveryProvider';
import {
  nextShopTrackingStep,
  recordShopTracking,
  shopTrackingLabels,
  shopTrackingStatus,
  shopTrackingTimeline,
} from '../../../features/delivery/shopTracking';
import {
  BookingStatus,
  formatBookingDate,
  shopBookingRole,
} from '../../../features/shop-workspace/bookingUI';
import { ShopPage, ShopPanel } from '../../../features/shop-workspace/ui';
import { usePalette } from '../../../hooks/usePalette';

export default function ShopBookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { requests, loading, loadError, reload, update } = useDelivery();
  const palette = usePalette();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const request = requests.find(
    (entry) => entry.id === id && entry.bookingSource === 'shop',
  );

  if (loading || !request || loadError) {
    return (
      <ShopPage title="Booking details">
        {loading ? (
          <ActivityIndicator
            color={palette.primary}
            accessibilityLabel="Loading booking"
          />
        ) : (
          <EmptyState
            title={loadError ? 'Couldn’t load booking' : 'Booking unavailable'}
            description={
              loadError
                ? 'Try loading your bookings again.'
                : 'Open a saved booking from your shop’s transport bookings.'
            }
          >
            <Button
              label={loadError ? 'Try again' : 'Transport bookings'}
              onPress={() =>
                loadError
                  ? void reload()
                  : router.dismissTo('/shop-workspace/bookings')
              }
            />
          </EmptyState>
        )}
      </ShopPage>
    );
  }

  const status = shopTrackingStatus(request);
  const next = nextShopTrackingStep(request);

  async function advance() {
    if (!next) return;
    setSaving(true);
    setError('');
    try {
      await update(id, (current) => recordShopTracking(current, next.status));
    } catch {
      setError('Couldn’t save the tracking update. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ShopPage title="Booking details">
      <View className="gap-4">
        <ShopPanel>
          <View className="flex-row flex-wrap items-center justify-between gap-2">
            <Text className="text-sm font-medium text-primary">
              {shopBookingRole(request)}
            </Text>
            <BookingStatus request={request} />
          </View>
          <Text
            accessibilityRole="header"
            className="text-2xl font-medium text-foreground"
          >
            {request.description || 'Parcel booking'}
          </Text>
          <View className="gap-3 border-t border-border pt-4">
            <View className="flex-row items-start gap-3">
              <Icon name="pin" size={19} color={palette.primary} />
              <View className="flex-1">
                <Text className="text-xs text-muted-foreground">Pickup</Text>
                <Text className="text-sm text-foreground">
                  {request.pickup}
                </Text>
              </View>
            </View>
            <View className="flex-row items-start gap-3">
              <Icon name="pin" size={19} color={palette.success} />
              <View className="flex-1">
                <Text className="text-xs text-muted-foreground">Drop-off</Text>
                <Text className="text-sm text-foreground">
                  {request.destination}
                </Text>
              </View>
            </View>
          </View>
        </ShopPanel>

        <ShopPanel>
          <Text
            accessibilityRole="header"
            className="text-base font-medium text-foreground"
          >
            Tracking timeline
          </Text>
          {shopTrackingTimeline(request).map((step) => (
            <View key={step.status} className="flex-row items-start gap-3">
              <View
                className={`h-6 w-6 items-center justify-center rounded-full ${step.reached ? 'bg-secondary' : 'bg-muted'}`}
              >
                <Icon
                  name={step.reached ? 'check' : 'clock'}
                  size={14}
                  color={
                    step.reached ? palette.primary : palette['muted-foreground']
                  }
                />
              </View>
              <View className="flex-1">
                <Text
                  className={`text-sm font-medium ${step.reached ? 'text-foreground' : 'text-muted-foreground'}`}
                >
                  {step.status === 'draft'
                    ? 'Request saved'
                    : shopTrackingLabels[step.status]}
                </Text>
                {!!step.at && (
                  <Text className="mt-0.5 text-xs text-muted-foreground">
                    {formatBookingDate(step.at)}
                  </Text>
                )}
              </View>
              {step.status === status && (
                <Text className="text-xs font-medium text-primary">
                  Current
                </Text>
              )}
            </View>
          ))}
        </ShopPanel>

        <Notice>
          Tracking updates are simulated and saved on this device.
        </Notice>
        {!!error && (
          <Text accessibilityRole="alert" className="text-sm text-destructive">
            {error}
          </Text>
        )}
        {status === 'draft' && (
          <Button
            label="Continue booking"
            onPress={() =>
              router.push({ pathname: '/request/[id]', params: { id } })
            }
          />
        )}
        {next && (
          <Button
            label={next.label}
            onPress={() => void advance()}
            loading={saving}
          />
        )}
        {(status === 'draft' || status === 'awaiting-pickup') && (
          <CancelRequest requestId={id} disabled={saving} />
        )}
        <Button
          label="View all transport bookings"
          secondary
          icon={null}
          onPress={() => router.dismissTo('/shop-workspace/bookings')}
        />
      </View>
    </ShopPage>
  );
}
