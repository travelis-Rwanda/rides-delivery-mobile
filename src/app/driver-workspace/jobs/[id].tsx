
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Text } from '../../../components/ui/Text';
import {
  Button,
  EmptyState,
  Field,
  Footer,
  Header,
  Page,
  PageScroll,
} from '../../../components/ui/primitives';
import { useDelivery } from '../../../features/delivery/DeliveryProvider';
import { formatMoney } from '../../../features/delivery/services';
import { useDriverSession } from '../../../features/driver-workspace/DriverSessionProvider';
import {
  contactsVisible,
  jobStatus,
} from '../../../features/driver-workspace/jobs';
import { JobDetails, JobTag } from '../../../features/driver-workspace/ui';
import { declineAndAdvance } from '../../../features/negotiation/assignment';
import { FinalOfferNotice } from '../../../features/negotiation/components/FinalOfferNotice';
import { OfferBubble } from '../../../features/negotiation/components/OfferBubble';
import { getMockDriver } from '../../../features/negotiation/mockDrivers';
import {
  acceptOffer,
  finalOfferDeadline,
  offerId,
  submitOffer,
  threadOf,
  type Negotiation,
  type Result,
} from '../../../features/negotiation/negotiation';
import { useNegotiation } from '../../../features/negotiation/NegotiationProvider';
import { straightLineKm } from '../../../features/pricing/minimumFare';
import { useNow } from '../../../hooks/useNow';
import { usePalette } from '../../../hooks/usePalette';
import { driverFareForTotal } from '../../../features/pricing/breakdown';

export default function DriverJobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const palette = usePalette();
  const { driverId, loading: sessionLoading } = useDriverSession();
  const { requests, loading: requestsLoading } = useDelivery();
  const {
    negotiations,
    loading: negotiationsLoading,
    loadError,
    reload,
    update,
  } = useNegotiation();
  const [counterOpen, setCounterOpen] = useState(false);
  const [counterText, setCounterText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // While a final offer waits for an answer, count down the seconds left.
  const earlyNegotiation = id ? negotiations[id] : undefined;
  const finalDeadline = earlyNegotiation
    ? finalOfferDeadline(earlyNegotiation)
    : undefined;
  const now = useNow(finalDeadline !== undefined);

  if (sessionLoading || requestsLoading || negotiationsLoading)
    return (
      <Page>
        <Header title="Delivery job" />
        <ActivityIndicator
          accessibilityLabel="Loading the job"
          color={palette.primary}
        />
      </Page>
    );
  if (loadError)
    return (
      <Page>
        <Header title="Delivery job" />
        <PageScroll>
          <EmptyState
            title="Couldn’t load this job"
            description="Try loading your saved negotiations again."
          >
            <Button label="Try again" onPress={() => void reload()} />
          </EmptyState>
        </PageScroll>
      </Page>
    );

  const request = requests.find((entry) => entry.id === id);
  const negotiation = id ? negotiations[id] : undefined;
  const driver = getMockDriver(driverId);
  const status = negotiation ? jobStatus(negotiation, driverId) : undefined;

  if (!request || !negotiation || !driver || !status)
    return (
      <Page>
        <Header title="Delivery job" />
        <PageScroll>
          <EmptyState
            title="This job isn’t available"
            description="It was cancelled, or it isn’t matched to the driver you’re acting as."
          >
            <Button
              label="Back to jobs"
              onPress={() => router.replace('/driver-workspace')}
            />
          </EmptyState>
        </PageScroll>
      </Page>
    );

  const requestId = request.id;
  const thread = threadOf(negotiation, driverId);
  const last = thread[thread.length - 1];
  const roundsLeft = negotiation.maxRoundsPerDriver - thread.length;

  const secondsLeft =
    finalDeadline === undefined
      ? undefined
      : Math.max(0, Math.ceil((finalDeadline - now) / 1000));

  const km = request.pickupPoint
    ? straightLineKm(request.pickupPoint, driver.location)
    : null;

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
    run((current) => acceptOffer(current, offerKey, 'driver', Date.now()));

  // Passing hands the delivery to the next best driver.
  const pass = (offerKey: string) =>
    run((current) => declineAndAdvance(current, offerKey, 'driver'));

  const sendCounter = async () => {
    if (!counterText.trim()) {
      setError('Enter your counter-offer.');
      return;
    }
    const amount = Number(counterText.replace(/[,\s]/g, ''));
    const result = await run((current) =>
      submitOffer(current, {
        id: offerId(current, driverId),
        driverId,
        by: 'driver',
        amount,
        now: new Date().toISOString(),
      }),
    );
    if (result.ok) {
      setCounterOpen(false);
      setCounterText('');
    }
  };

  return (
    <Page avoidKeyboard>
      <Header title="Delivery job" />
      <PageScroll>
        <View className="mb-4 gap-2 rounded-[20px] bg-card p-5">
          <View className="flex-row items-center justify-between gap-3">
            <JobTag status={status} />
            <Text className="text-xs text-muted-foreground">
              Acting as {driver.name}
            </Text>
          </View>
          <Text className="mt-1 text-sm font-medium text-foreground">
            {request.pickup}
          </Text>
          <Text className="text-xs text-muted-foreground">
            to {request.destination}
          </Text>
          <Text className="mt-1 text-xs leading-5 text-muted-foreground">
            {request.size}
            {request.urgent ? ' · Urgent' : ''}
            {km !== null ? ` · ${km.toFixed(1)} km from you to pickup` : ''}
          </Text>
          <Text className="text-xs leading-5 text-muted-foreground">
            No price can go below {formatMoney(negotiation.minimumFare)}. Prices
            include the service fee and tax.
          </Text>
          {last && driverFareForTotal(last.amount) !== null && (
            <Text className="text-xs font-medium leading-5 text-foreground">
              On the latest price you earn{' '}
              {formatMoney(driverFareForTotal(last.amount)!)} after fees and
              tax.
            </Text>
          )}
        </View>
        <JobDetails request={request} contactsVisible={contactsVisible(status)} />
        {status === 'agreed' && (
          <View className="mb-4 rounded-[20px] bg-success-muted p-5">
            <Text className="text-xs font-medium tracking-wider text-muted-foreground">
              FARE AGREED
            </Text>
            <Text className="mt-1 text-[26px] font-bold tracking-tight text-foreground">
              {formatMoney(negotiation.lockedFare ?? last.amount)}
            </Text>
            <Text className="mt-1 text-sm text-muted-foreground">
              The customer continues to review their request.
            </Text>
          </View>
        )}

        {status === 'passed' && (
          <Text className="mb-4 text-sm leading-6 text-muted-foreground">
            This delivery has moved on to another driver.
          </Text>
        )}

        <View accessibilityLabel="Offers">
          {thread.map((offer, index) => (
            <OfferBubble
              key={offer.id}
              offer={offer}
              index={index}
              viewer="driver"
            />
          ))}
        </View>

        {status !== 'agreed' &&
          status !== 'passed' &&
          secondsLeft !== undefined && (
            <FinalOfferNotice
              viewer="driver"
              lastBy={last.by}
              secondsLeft={secondsLeft}
              otherName="the customer"
            />
          )}

        {status === 'waiting' && (
          <Text className="mt-2 text-sm leading-6 text-muted-foreground">
            Waiting for the customer to reply. They respond from their own
            request screen.
          </Text>
        )}

        {status === 'your-turn' && !counterOpen && (
          <View className="mt-2 gap-2">
            <Button
              label="Accept this price"
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
            ) : null}
            <Button
              label="Pass on this job"
              icon="close"
              secondary
              disabled={busy}
              onPress={() => void pass(last.id)}
            />
          </View>
        )}

        {status === 'your-turn' && counterOpen && (
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
              onPress={() => void sendCounter()}
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

        {!!error && (
          <Text
            accessibilityRole="alert"
            className="mt-3 text-sm text-destructive"
          >
            {error}
          </Text>
        )}
      </PageScroll>
      <Footer>
        <Button
          label="Back to jobs"
          icon="back"
          secondary
          onPress={() => router.replace('/driver-workspace')}
        />
      </Footer>
    </Page>
  );
}
