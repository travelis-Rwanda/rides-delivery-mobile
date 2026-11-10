
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { CancelRequest } from '../../features/delivery/components/CancelRequest';

import { Text } from '../../components/ui/Text';
import {
  Button,
  EmptyState,
  Field,
  Footer,
  Header,
  Notice,
  Page,
  PageScroll,
} from '../../components/ui/primitives';
import { useDelivery } from '../../features/delivery/DeliveryProvider';
import { formatMoney } from '../../features/delivery/services';
import {
  getMockDriver,
  mockDriverReply,
  mockDrivers,
} from '../../features/negotiation/mockDrivers';
import {
  acceptOffer,
  declineOffer,
  offerId,
  submitOffer,
  threadOf,
  type Negotiation,
  type Result,
} from '../../features/negotiation/negotiation';
import { useNegotiation } from '../../features/negotiation/NegotiationProvider';
import {
  minimumFareForRequest,
  requestPricing,
  tripKey,
} from '../../features/pricing/forRequest';
import { usePalette } from '../../hooks/usePalette';

export default function NegotiateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { requests, loading: requestsLoading } = useDelivery();
  const { negotiations, loading, loadError, reload, open, update, discard } =
    useNegotiation();
  const palette = usePalette();
  const [counterFor, setCounterFor] = useState<string>();
  const [counterText, setCounterText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const request = requests.find((entry) => entry.id === id);
  const minimum = request ? minimumFareForRequest(request) : null;
  const minimumAmount = minimum?.amount;

  const negotiation = id ? negotiations[id] : undefined;
  const key = request ? tripKey(request) : undefined;
  const pricing = request ? requestPricing(request, negotiation) : undefined;
  const stale = pricing?.kind === 'awaiting' && pricing.stale;

  // Open offers for this trip, and drop offers made for an older version of it.
  useEffect(() => {
    if (
      !id ||
      key === undefined ||
      minimumAmount === undefined ||
      loading ||
      loadError
    )
      return;

    if (negotiation && stale) {
      discard(id).catch(() =>
        setError('Could not refresh driver offers. Try again.'),
      );
      return;
    }

    if (negotiation) return;

    open(id, minimumAmount, key).catch(() =>
      setError('Could not load driver offers. Try again.'),
    );
  }, [
    id,
    key,
    minimumAmount,
    loading,
    loadError,
    negotiation,
    stale,
    open,
    discard,
  ]);

  if (loading || requestsLoading)
    return (
      <Page>
        <Header title="Driver offers" />
        <ActivityIndicator
          accessibilityLabel="Loading driver offers"
          color={palette.primary}
        />
      </Page>
    );

  if (loadError)
    return (
      <Page>
        <Header title="Driver offers" />
        <PageScroll>
          <EmptyState
            title="Couldn’t load driver offers"
            description="Try loading your saved negotiations again."
          >
            <Button label="Try again" onPress={() => void reload()} />
          </EmptyState>
        </PageScroll>
      </Page>
    );

  if (!request)
    return (
      <Page>
        <Header title="Driver offers" />
        <PageScroll>
          <EmptyState
            title="Request not found"
            description="Start a new request to see driver offers."
          >
            <Button label="Explore services" onPress={() => router.replace('/')} />
          </EmptyState>
        </PageScroll>
      </Page>
    );

  if (!minimum)
    return (
      <Page>
        <Header title="Driver offers" />
        <PageScroll>
          <EmptyState
            title="No negotiation for this service"
            description="Only parcel and cargo fares are negotiated with drivers."
          >
            <Button
              label="Back to review"
              onPress={() =>
                router.replace({
                  pathname: '/request/[id]',
                  params: { id: request.id },
                })
              }
            />
          </EmptyState>
        </PageScroll>
      </Page>
    );

  if (!negotiation)
    return (
      <Page>
        <Header title="Driver offers" />
        {error ? (
          <PageScroll>
            <EmptyState title="Couldn’t load driver offers" description={error}>
              <Button
                label="Try again"
                onPress={() => {
                  setError('');
                  void reload();
                }}
              />
            </EmptyState>
          </PageScroll>
        ) : (
          <ActivityIndicator
            accessibilityLabel="Finding drivers"
            color={palette.primary}
          />
        )}
      </Page>
    );

  const requestId = request.id;
  const locked = negotiation.status === 'locked';
  const lockedOffer = negotiation.offers.find(
    (offer) => offer.id === negotiation.lockedOfferId,
  );
  const lockedDriver = lockedOffer && getMockDriver(lockedOffer.driverId);

  // Every change goes through one function so busy and error stay consistent.
  const run = async (change: (current: Negotiation) => Result) => {
    setBusy(true);
    setError('');
    const result = await update(requestId, change);
    if (!result.ok) setError(result.error);
    setBusy(false);
    return result;
  };

  const accept = (id: string) =>
    run((current) => acceptOffer(current, id, 'customer'));

  const decline = (id: string) =>
    run((current) => declineOffer(current, id, 'customer'));

  const simulateReply = (driverId: string) =>
    run((current) =>
      mockDriverReply(current, driverId, new Date().toISOString()),
    );

  const sendCounter = async (driverId: string) => {
    if (!counterText.trim()) {
      setError('Enter your counter-offer.');
      return;
    }

    const amount = Number(counterText.replace(/[,\s]/g, ''));
    const result = await run((current) =>
      submitOffer(current, {
        id: offerId(current, driverId),
        driverId,
        by: 'customer',
        amount,
        now: new Date().toISOString(),
      }),
    );

    if (result.ok) {
      setCounterFor(undefined);
      setCounterText('');
    }
  };

  return (
    <Page>
      <Header title="Driver offers" />
      <PageScroll>
        <Text className="text-[10px] font-bold tracking-[1.5px] text-primary">
          NAME YOUR PRICE
        </Text>

        <Text
          accessibilityRole="header"
          className="mt-2 text-[26px] font-medium leading-[35px] tracking-[-0.7px] text-foreground"
        >
          Agree a fare with a driver.
        </Text>

        <Text className="mb-6 mt-3 text-sm leading-6 text-muted-foreground">
          Accept an offer, or counter with your own price. No offer can go
          below {formatMoney(negotiation.minimumFare)}.
        </Text>

        {minimum.distanceSource !== 'road' && !locked && (
          <View className="mb-4">
            <Notice warning>
              This minimum is an estimate because no road route is saved yet.
            </Notice>
          </View>
        )}

        {locked && lockedOffer && (
          <View className="mb-4 rounded-[20px] bg-success-muted p-5">
            <Text className="text-xs font-medium tracking-wider text-muted-foreground">
              FARE AGREED
            </Text>
            <Text className="mt-1 text-[26px] font-bold tracking-tight text-foreground">
              {formatMoney(lockedOffer.amount)}
            </Text>
            <Text className="mt-1 text-sm text-muted-foreground">
              with {lockedDriver?.name ?? 'your driver'}
            </Text>
          </View>
        )}

        {mockDrivers.map((driver) => {
          const thread = threadOf(negotiation, driver.id);
          const last = thread[thread.length - 1];

          if (!last) return null;

          const agreed = negotiation.lockedOfferId === last.id;
          const driverAsking =
            last.status === 'pending' && last.by === 'driver';
          const waiting =
            last.status === 'pending' && last.by === 'customer';
          const countering = counterFor === driver.id;

          const tag = agreed
            ? 'AGREED'
            : last.status === 'declined'
              ? 'DECLINED'
              : driverAsking
                ? 'DRIVER’S OFFER'
                : waiting
                  ? 'YOUR COUNTER'
                  : '';

          return (
            <View
              key={driver.id}
              className={`mb-4 rounded-[20px] bg-card p-5 ${last.status === 'declined' ? 'opacity-60' : ''}`}
            >
              <View className="flex-row items-center justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-base font-bold text-foreground">
                    {driver.name}
                  </Text>
                  <Text className="mt-0.5 text-xs text-muted-foreground">
                    {driver.vehicle}
                  </Text>
                </View>

                <View className="items-end">
                  <Text className="text-xl font-bold tracking-tight text-primary">
                    {formatMoney(last.amount)}
                  </Text>
                  <Text className="mt-0.5 text-[10px] font-medium text-muted-foreground">
                    {tag}
                  </Text>
                </View>
              </View>

              {thread.length > 1 && (
                <Text className="mt-3 text-xs leading-5 text-muted-foreground">
                  {thread
                    .map(
                      (offer) =>
                        `${offer.by === 'driver' ? 'Driver' : 'You'} ${formatMoney(offer.amount)}`,
                    )
                    .join('  →  ')}
                </Text>
              )}

              {driverAsking && !locked && !countering && (
                <View className="mt-4 gap-2">
                  <Button
                    label="Accept this fare"
                    icon="check"
                    disabled={busy}
                    onPress={() => void accept(last.id)}
                  />
                  <Button
                    label="Counter-offer"
                    icon="edit"
                    secondary
                    disabled={busy}
                    onPress={() => {
                      setError('');
                      setCounterText('');
                      setCounterFor(driver.id);
                    }}
                  />
                  <Button
                    label="Decline"
                    icon="close"
                    secondary
                    disabled={busy}
                    onPress={() => void decline(last.id)}
                  />
                </View>
              )}

              {driverAsking && !locked && countering && (
                <View className="mt-4 gap-3">
                  <Field
                    label="Your counter-offer (RWF)"
                    placeholder={`At least ${negotiation.minimumFare}`}
                    keyboardType="number-pad"
                    value={counterText}
                    onChangeText={setCounterText}
                  />
                  <Button
                    label="Send counter-offer"
                    loading={busy}
                    onPress={() => void sendCounter(driver.id)}
                  />
                  <Button
                    label="Cancel"
                    icon={null}
                    secondary
                    disabled={busy}
                    onPress={() => {
                      setError('');
                      setCounterFor(undefined);
                    }}
                  />
                </View>
              )}

              {waiting && !locked && (
                <View className="mt-4 gap-2">
                  <Text className="text-sm text-muted-foreground">
                    Waiting for {driver.name} to reply.
                  </Text>
                  <Button
                    label="Simulate driver reply"
                    icon={null}
                    secondary
                    loading={busy}
                    onPress={() => void simulateReply(driver.id)}
                  />
                  <Text className="text-[11px] leading-[18px] text-muted-foreground">
                    Prototype only. Real drivers will reply on their own.
                  </Text>
                </View>
              )}
            </View>
          );
        })}
        
        <View className="mt-2">
          <CancelRequest requestId={requestId} />
        </View>

        {!!error && (
          <Text
            accessibilityRole="alert"
            className="mt-2 text-sm text-destructive"
          >
            {error}
          </Text>
        )}
      </PageScroll>

      <Footer>
        {locked ? (
          <Button
            label="Continue to review"
            icon="check"
            onPress={() =>
              router.replace({
                pathname: '/request/[id]',
                params: { id: requestId },
              })
            }
          />
        ) : (
          <Text className="text-center text-xs leading-5 text-muted-foreground">
            Saved on this device. Driver offers and replies are simulated.
          </Text>
        )}
      </Footer>
    </Page>
  );
}
