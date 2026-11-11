
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

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
import { CancelRequest } from '../../features/delivery/components/CancelRequest';
import { useDelivery } from '../../features/delivery/DeliveryProvider';
import { formatMoney } from '../../features/delivery/services';
import {
  declineAndAdvance,
  matchSummary,
} from '../../features/negotiation/assignment';
import { OfferBubble } from '../../features/negotiation/components/OfferBubble';
import { getMockDriver } from '../../features/negotiation/mockDrivers';
import {
  acceptOffer,
  offerId,
  submitOffer,
  threadOf,
  type Negotiation,
  type Result,
} from '../../features/negotiation/negotiation';
import { useNegotiation } from '../../features/negotiation/NegotiationProvider';
import { jobOf } from '../../features/negotiation/selection';
import {
  minimumFareForRequest,
  requestPricing,
  tripKey,
} from '../../features/pricing/forRequest';
import { straightLineKm } from '../../features/pricing/minimumFare';
import { usePalette } from '../../hooks/usePalette';

export default function NegotiateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { requests, loading: requestsLoading } = useDelivery();
  const { negotiations, loading, loadError, reload, open, update, discard } =
    useNegotiation();
  const palette = usePalette();
  const [counterOpen, setCounterOpen] = useState(false);
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
  // Offers saved before drivers were matched have no assignment. Start again.
  const legacy =
    !!negotiation && negotiation.status === 'open' && !negotiation.assignment;

  // Match a driver the first time this screen opens, and start again if the
  // trip changed since the offers were made.
  useEffect(() => {
    if (
      !id ||
      !request ||
      key === undefined ||
      minimumAmount === undefined ||
      loading ||
      loadError
    )
      return;
    if (negotiation && (stale || legacy)) {
      discard(id).catch(() =>
        setError('Could not refresh your driver. Try again.'),
      );
      return;
    }
    if (negotiation) return;
    open(id, minimumAmount, key, jobOf(request)).catch(() =>
      setError('Could not find a driver. Try again.'),
    );
  }, [
    id,
    request,
    key,
    minimumAmount,
    loading,
    loadError,
    negotiation,
    stale,
    legacy,
    open,
    discard,
  ]);

  if (loading || requestsLoading)
    return (
      <Page>
        <Header title="Your driver" />
        <ActivityIndicator
          accessibilityLabel="Loading your driver"
          color={palette.primary}
        />
      </Page>
    );
  if (loadError)
    return (
      <Page>
        <Header title="Your driver" />
        <PageScroll>
          <EmptyState
            title="Couldn’t load your driver"
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
        <Header title="Your driver" />
        <PageScroll>
          <EmptyState
            title="Request not found"
            description="Start a new request to find a driver."
          >
            <Button label="Explore services" onPress={() => router.replace('/')} />
          </EmptyState>
        </PageScroll>
      </Page>
    );
  if (!minimum)
    return (
      <Page>
        <Header title="Your driver" />
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
  if (!negotiation || stale || legacy)
    return (
      <Page>
        <Header title="Your driver" />
        {error ? (
          <PageScroll>
            <EmptyState title="Couldn’t find a driver" description={error}>
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
            accessibilityLabel="Finding your driver"
            color={palette.primary}
          />
        )}
      </Page>
    );

  const requestId = request.id;
  const locked = negotiation.status === 'locked';
  const assignment = negotiation.assignment;
  const lockedOffer = negotiation.offers.find(
    (offer) => offer.id === negotiation.lockedOfferId,
  );
  const driverId = assignment?.current ?? lockedOffer?.driverId;
  const driver = driverId ? getMockDriver(driverId) : undefined;
  const thread = driverId ? threadOf(negotiation, driverId) : [];
  const last = thread[thread.length - 1];
  const distanceKm =
    request.pickupPoint && driver
      ? straightLineKm(request.pickupPoint, driver.location)
      : null;
  const driverAsking = last?.status === 'pending' && last.by === 'driver';
  const waiting = last?.status === 'pending' && last.by === 'customer';
  const roundsLeft = negotiation.maxRoundsPerDriver - thread.length;
  const noDrivers = !locked && !!assignment && assignment.current === undefined;
  const skipped = assignment?.tried.length ?? 0;

  // Every change goes through one function so busy and error stay consistent.
  const run = async (change: (current: Negotiation) => Result) => {
    setBusy(true);
    setError('');
    const result = await update(requestId, change);
    if (!result.ok) setError(result.error);
    setBusy(false);
    return result;
  };

  const accept = (offerKey: string) =>
    run((current) => acceptOffer(current, offerKey, 'customer'));

  // Declining ends this driver's chance, so the next best driver steps in.
  const decline = (offerKey: string) =>
    run((current) => declineAndAdvance(current, offerKey, 'customer'));

  const sendCounter = async (forDriver: string) => {
    if (!counterText.trim()) {
      setError('Enter your counter-offer.');
      return;
    }
    const amount = Number(counterText.replace(/[,\s]/g, ''));
    const result = await run((current) =>
      submitOffer(current, {
        id: offerId(current, forDriver),
        driverId: forDriver,
        by: 'customer',
        amount,
        now: new Date().toISOString(),
      }),
    );
    if (result.ok) {
      setCounterOpen(false);
      setCounterText('');
    }
  };

  const searchAgain = async () => {
    setBusy(true);
    setError('');
    try {
      await discard(requestId);
    } catch {
      setError('Could not search again. Try again.');
    }
    setBusy(false);
  };

  return (
    <Page>
      <Header title="Your driver" />
      <PageScroll>
        <Text className="text-[10px] font-bold tracking-[1.5px] text-primary">
          NAME YOUR PRICE
        </Text>
        <Text
          accessibilityRole="header"
          className="mt-2 text-[26px] font-medium leading-[35px] tracking-[-0.7px] text-foreground"
        >
          Agree a fare with your driver.
        </Text>
        <Text className="mb-6 mt-3 text-sm leading-6 text-muted-foreground">
          You and your driver trade prices only. No price can go below{' '}
          {formatMoney(negotiation.minimumFare)}.
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
              with {driver?.name ?? 'your driver'}
            </Text>
          </View>
        )}

        {noDrivers && (
          <View className="mb-4 gap-3 rounded-[20px] bg-card p-5">
            <Text className="text-base font-bold text-foreground">
              {assignment.order.length === 0
                ? 'No driver can carry this delivery'
                : 'No drivers left for now'}
            </Text>
            <Text className="text-sm leading-6 text-muted-foreground">
              {assignment.order.length === 0
                ? 'None of our drivers has a vehicle that fits this size and service. Try a different size.'
                : 'Every driver we could match has passed on this delivery. You can search again.'}
            </Text>
            {assignment.order.length > 0 && (
              <Button
                label="Search again"
                icon="search"
                loading={busy}
                onPress={() => void searchAgain()}
              />
            )}
          </View>
        )}

        {driver && (
          <View className="mb-4 rounded-[20px] bg-card p-5">
            <Text className="text-base font-bold text-foreground">
              {driver.name}
            </Text>
            <Text className="mt-0.5 text-xs text-muted-foreground">
              {driver.vehicle}
            </Text>
            {assignment && (
              <Text className="mt-3 text-xs leading-5 text-muted-foreground">
                {matchSummary(assignment, distanceKm)}
              </Text>
            )}
            {skipped > 0 && !locked && (
              <Text className="mt-2 text-xs leading-5 text-muted-foreground">
                Your earlier driver didn’t reach a deal, so we moved on to{' '}
                {driver.name}.
              </Text>
            )}
          </View>
        )}

        <View accessibilityLabel="Offers">
          {thread.map((offer, index) => (
            <OfferBubble
              key={offer.id}
              offer={offer}
              index={index}
              viewer="customer"
            />
          ))}
        </View>

        {driver && driverAsking && !locked && !counterOpen && (
          <View className="mt-2 gap-2">
            <Button
              label="Accept this fare"
              icon="check"
              disabled={busy}
              onPress={() => void accept(last.id)}
            />
            {roundsLeft > 0 ? (
              <Button
                label="Counter-offer"
                icon="edit"
                secondary
                disabled={busy}
                onPress={() => {
                  setError('');
                  setCounterText('');
                  setCounterOpen(true);
                }}
              />
            ) : (
              <Text className="text-xs leading-5 text-muted-foreground">
                This is the final offer. Accept it, or decline to try the next
                driver.
              </Text>
            )}
            <Button
              label="Decline and try the next driver"
              icon="close"
              secondary
              disabled={busy}
              onPress={() => void decline(last.id)}
            />
          </View>
        )}

        {driver && driverAsking && !locked && counterOpen && (
          <View className="mt-2 gap-3">
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
                setCounterOpen(false);
              }}
            />
          </View>
        )}

        {driver && waiting && !locked && (
          <Text className="mt-2 text-sm leading-6 text-muted-foreground">
            Waiting for {driver.name} to reply. They answer from the Driver
            workspace (Help, then Partner workspaces).
          </Text>
        )}

        {!!error && (
          <Text
            accessibilityRole="alert"
            className="mt-3 text-sm text-destructive"
          >
            {error}
          </Text>
        )}

        <View className="mt-6">
          <CancelRequest requestId={requestId} />
        </View>
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
            Saved on this device. Drivers reply from the Driver workspace.
          </Text>
        )}
      </Footer>
    </Page>
  );
}
