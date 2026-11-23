
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Icon } from '../../components/ui/Icon';
import { Text } from '../../components/ui/Text';
import {
  Button,
  EmptyState,
  Footer,
  Header,
  Notice,
  Page,
  PageScroll,
} from '../../components/ui/primitives';
import { useDelivery } from '../../features/delivery/DeliveryProvider';
import { formatMoney } from '../../features/delivery/services';
import { getMockDriver } from '../../features/negotiation/mockDrivers';
import { ProofPhoto } from '../../features/trips/components/ProofPhoto';
import { RatingCard } from '../../features/trips/components/RatingCard';
import { TipCard } from '../../features/trips/components/TipCard';
import { useTrips } from '../../features/trips/TripProvider';
import {
  complete,
  confirmPickup,
  waitingOn,
  type Trip,
  type TripResult,
} from '../../features/trips/trip';
import {
  customerActions,
  customerHeadline,
  timeline,
} from '../../features/trips/view';
import { usePalette } from '../../hooks/usePalette';

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString([], {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function TrackScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { requests, loading: requestsLoading } = useDelivery();
  const { trips, loading, loadError, reload, act } = useTrips();
  const palette = usePalette();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  if (loading || requestsLoading)
    return (
      <Page>
        <Header title="Track delivery" />
        <ActivityIndicator
          accessibilityLabel="Loading delivery"
          color={palette.primary}
        />
      </Page>
    );

  if (loadError)
    return (
      <Page>
        <Header title="Track delivery" />
        <PageScroll>
          <EmptyState
            title="Saved deliveries are unavailable"
            description="Your deliveries could not be read. Try again."
          >
            <Button label="Try again" onPress={() => void reload()} />
          </EmptyState>
        </PageScroll>
      </Page>
    );

  const trip = trips[id];
  const request = requests.find((entry) => entry.id === id);

  if (!trip)
    return (
      <Page>
        <Header title="Track delivery" />
        <PageScroll>
          <EmptyState
            title="No delivery to track yet"
            description="A delivery starts as soon as your payment is received."
          >
            <Button
              label="View activity"
              onPress={() => router.replace('/activity')}
            />
          </EmptyState>
        </PageScroll>
      </Page>
    );

  const driver = getMockDriver(trip.driverId);
  const driverName = driver?.name ?? 'Your driver';
  const headline = customerHeadline(trip, driverName);
  const actions = customerActions(trip);

  const run = async (change: (t: Trip, now: string) => TripResult) => {
    setBusy(true);
    setError(undefined);
    const result = await act(trip.requestId, change);
    setBusy(false);
    if (!result.ok) setError(result.error);
  };

  return (
    <Page>
      <Header title="Track delivery" />
      <PageScroll>
        <View className="mb-5 gap-2 rounded-[20px] bg-card p-5">
          <Text className="text-xs font-medium tracking-wider text-muted-foreground">
            {headline.title.toUpperCase()}
          </Text>
          <Text
            accessibilityRole="header"
            className="text-[22px] font-medium leading-8 text-foreground"
          >
            {headline.detail}
          </Text>
          {waitingOn(trip) === 'driver' && (
            <Text className="text-xs text-muted-foreground">
              Waiting for {driverName}.
            </Text>
          )}
        </View>

        <View className="mb-5 rounded-[20px] bg-card p-5">
          <Text className="mb-4 text-xs font-medium tracking-wider text-muted-foreground">
            PROGRESS
          </Text>
          {timeline(trip).map((step, index, all) => {
            const ringColor =
              step.state === 'upcoming'
                ? palette.border
                : step.state === 'current'
                  ? palette.primary
                  : palette.success;
            return (
              <View key={step.status} className="flex-row gap-3">
                <View className="items-center">
                  <View
                    className="h-6 w-6 items-center justify-center rounded-full"
                    style={{
                      borderWidth: 2,
                      borderColor: ringColor,
                      backgroundColor:
                        step.state === 'done' ? palette.success : 'transparent',
                    }}
                  >
                    {step.state === 'done' && (
                      <Icon name="check" size={12} color="#FFFFFF" />
                    )}
                    {step.state === 'current' && (
                      <View
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: palette.primary }}
                      />
                    )}
                  </View>
                  {index < all.length - 1 && (
                    <View
                      className="my-1 w-0.5 flex-1"
                      style={{
                        backgroundColor:
                          step.state === 'done'
                            ? palette.success
                            : palette.border,
                      }}
                    />
                  )}
                </View>
                <View className="flex-1 pb-5">
                  <Text
                    className={
                      step.state === 'upcoming'
                        ? 'text-sm text-muted-foreground'
                        : 'text-sm font-medium text-foreground'
                    }
                  >
                    {step.label}
                  </Text>
                  {step.at && (
                    <Text className="text-xs text-muted-foreground">
                      {formatWhen(step.at)}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
          {trip.pickupConfirmedAt && (
            <Text className="text-xs text-muted-foreground">
              You confirmed the pickup at {formatWhen(trip.pickupConfirmedAt)}.
            </Text>
          )}
        </View>

        <View className="mb-5 gap-3 rounded-[20px] bg-card p-5">
          <Text className="text-xs font-medium tracking-wider text-muted-foreground">
            YOUR DELIVERY
          </Text>
          <Text className="text-sm font-medium text-foreground">
            {driverName}
            {driver ? ` · ${driver.vehicle}` : ''}
          </Text>
          {request && (
            <View className="flex-row items-start gap-3">
              <Icon name="parcel" color={palette.primary} size={20} />
              <View className="flex-1">
                <Text className="text-sm text-foreground">{request.pickup}</Text>
                <Text className="my-1 text-xs text-muted-foreground">to</Text>
                <Text className="text-sm text-foreground">
                  {request.destination}
                </Text>
              </View>
            </View>
          )}
          <Text className="text-sm text-muted-foreground">
            Paid {formatMoney(trip.total)}
          </Text>
        </View>

        {trip.proofPhoto && (
          <View className="mb-5 gap-3 rounded-[20px] bg-card p-5">
            <Text className="text-xs font-medium tracking-wider text-muted-foreground">
              PROOF OF DELIVERY
            </Text>
            <ProofPhoto photoKey={trip.proofPhoto} />
          </View>
        )}

        {trip.status === 'completed' && (
          <>
            <TipCard trip={trip} driverName={driverName} />
            <RatingCard trip={trip} driverName={driverName} />
          </>
        )}

        {error && <Notice warning>{error}</Notice>}
      </PageScroll>

      <Footer>
        {actions.confirmPickup && (
          <Button
            label="Confirm pickup"
            loading={busy}
            onPress={() => run((t, now) => confirmPickup(t, now))}
          />
        )}
        {actions.confirmDelivery && (
          <Button
            label="Confirm delivery received"
            loading={busy}
            onPress={() => run((t, now) => complete(t, now))}
          />
        )}
        <Button
          secondary={actions.confirmPickup || actions.confirmDelivery}
          label="View activity"
          icon={null}
          onPress={() => router.replace('/activity')}
        />
      </Footer>
    </Page>
  );
}
