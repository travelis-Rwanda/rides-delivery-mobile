import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Icon } from '../../components/ui/Icon';
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
import { formatPhone } from '../../features/delivery/contact';
import { useDelivery } from '../../features/delivery/DeliveryProvider';
import { formatMoney } from '../../features/delivery/services';
import { useNegotiation } from '../../features/negotiation/NegotiationProvider';
import { AmountBreakdown } from '../../features/payments/components/AmountBreakdown';
import type { PhoneAnswer } from '../../features/payments/mockGateway';
import {
  methodLabels,
  pendingDeadline,
  type PaymentMethod,
} from '../../features/payments/payment';
import { usePayments } from '../../features/payments/PaymentProvider';
import {
  formatCountdown,
  paymentState,
  receiptRows,
} from '../../features/payments/view';
import { requestPricing } from '../../features/pricing/forRequest';
import { usePalette } from '../../hooks/usePalette';
import { useNow } from '../../hooks/useNow';

const METHODS = Object.keys(methodLabels) as PaymentMethod[];

export default function PaymentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const palette = usePalette();
  const { requests, loading: requestsLoading } = useDelivery();
  const { negotiations, loading: negotiationsLoading } = useNegotiation();
  const {
    payments,
    loading: paymentsLoading,
    loadError,
    reload,
    pay,
    answer,
  } = usePayments();
  const [method, setMethod] = useState<PaymentMethod>('mtn_momo');
  const [phone, setPhone] = useState<string | undefined>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const request = requests.find((entry) => entry.id === id);
  const payment = id ? payments[id] : undefined;
  const state = paymentState(payment);
  // While a request waits on the phone, count down to when it runs out.
  const deadline = payment ? pendingDeadline(payment) : undefined;
  const now = useNow(deadline !== undefined);

  if (requestsLoading || negotiationsLoading || paymentsLoading)
    return (
      <Page>
        <Header title="Payment" />
        <ActivityIndicator
          accessibilityLabel="Loading payment"
          color={palette.primary}
        />
      </Page>
    );
  if (loadError)
    return (
      <Page>
        <Header title="Payment" />
        <PageScroll>
          <EmptyState
            title="Couldn’t load your payments"
            description="Try loading your saved payments again."
          >
            <Button label="Try again" onPress={() => void reload()} />
          </EmptyState>
        </PageScroll>
      </Page>
    );

  const pricing = request
    ? requestPricing(request, negotiations[request.id])
    : undefined;

  if (!request || !request.previewConfirmed)
    return (
      <Page>
        <Header title="Payment" />
        <PageScroll>
          <EmptyState
            title="Confirm your request first"
            description="You can pay once your request is reviewed and confirmed."
          >
            <Button
              label="View activity"
              onPress={() => router.replace('/activity')}
            />
          </EmptyState>
        </PageScroll>
      </Page>
    );
  if (!pricing || pricing.kind !== 'agreed')
    return (
      <Page>
        <Header title="Payment" />
        <PageScroll>
          <EmptyState
            title="Nothing to pay yet"
            description="Payment opens once you and a driver have agreed a fare."
          >
            <Button
              label="Back to your request"
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

  const requestId = request.id;
  const total = pricing.total;
  const lastAttempt = payment?.attempts[payment.attempts.length - 1];
  const phoneValue =
    phone ?? (lastAttempt ? formatPhone(lastAttempt.phone) : '');
  const secondsLeft =
    deadline === undefined ? 0 : Math.ceil((deadline - now) / 1000);

  const backToConfirmation = () =>
    router.replace({ pathname: '/confirmed/[id]', params: { id: requestId } });

  async function startPayment() {
    setBusy(true);
    setError('');
    const result = await pay(requestId, total, { method, phone: phoneValue });
    if (!result.ok) setError(result.error);
    setBusy(false);
  }

  // PROTOTYPE ONLY: stands in for the customer answering on their own phone.
  async function reply(choice: PhoneAnswer) {
    setBusy(true);
    setError('');
    const result = await answer(requestId, choice);
    if (!result.ok) setError(result.error);
    setBusy(false);
  }

  return (
    <Page avoidKeyboard>
      <Header title="Payment" />
      <PageScroll>
        <Text className="text-[10px] font-bold tracking-[1.5px] text-primary">
          MOBILE MONEY
        </Text>
        <Text
          accessibilityRole="header"
          className="mb-6 mt-2 text-[26px] font-medium leading-[35px] tracking-[-0.7px] text-foreground"
        >
          {state.kind === 'paid'
            ? 'Payment received.'
            : `Pay ${formatMoney(total)}.`}
        </Text>

        <AmountBreakdown breakdown={pricing.breakdown} />

        {state.kind === 'paid' && (
          <View className="mt-4 gap-3 rounded-[20px] bg-success-muted p-5">
            <View className="flex-row items-center gap-2">
              <Icon name="check" size={18} color={palette.success} />
              <Text className="text-xs font-medium tracking-wider text-foreground">
                PAID
              </Text>
            </View>
            {receiptRows(state.attempt).map((row) => (
              <View key={row.label} className="flex-row justify-between gap-3">
                <Text className="text-sm text-muted-foreground">
                  {row.label}
                </Text>
                <Text className="flex-1 text-right text-sm text-foreground">
                  {row.value}
                </Text>
              </View>
            ))}
            <Text className="text-xs text-muted-foreground">
              {new Date(state.attempt.updatedAt).toLocaleString()}
            </Text>
          </View>
        )}

        {state.kind === 'pending' && (
          <View className="mt-4 gap-3">
            <View className="gap-2 rounded-[20px] bg-card p-5">
              <View className="flex-row items-center gap-2">
                <Icon name="clock" size={18} color={palette.primary} />
                <Text className="text-base font-bold text-foreground">
                  Check your phone
                </Text>
              </View>
              <Text className="text-sm leading-6 text-muted-foreground">
                We sent a request for {formatMoney(state.attempt.amount)} to{' '}
                {formatPhone(state.attempt.phone)} on{' '}
                {methodLabels[state.attempt.method]}. Approve it there with your
                Mobile Money PIN.
              </Text>
              <Text
                accessibilityRole="timer"
                className={`text-sm font-medium ${secondsLeft <= 15 ? 'text-destructive' : 'text-foreground'}`}
              >
                {secondsLeft > 0
                  ? `Expires in ${formatCountdown(secondsLeft)}`
                  : 'Expiring now…'}
              </Text>
            </View>
            <View className="gap-2 rounded-[20px] bg-secondary p-5">
              <Text className="text-xs font-medium tracking-wider text-muted-foreground">
                PROTOTYPE ONLY
              </Text>
              <Text className="text-xs leading-5 text-muted-foreground">
                In the real app the customer answers on their own phone. Use
                these buttons to see both outcomes. No money moves.
              </Text>
              <Button
                label="Approve on the phone"
                icon="check"
                disabled={busy}
                onPress={() => void reply('approve')}
              />
              <Button
                label="Decline on the phone"
                icon="close"
                secondary
                disabled={busy}
                onPress={() => void reply('decline')}
              />
            </View>
          </View>
        )}

        {(state.kind === 'unpaid' || state.kind === 'failed') && (
          <View className="mt-4 gap-4">
            {state.kind === 'failed' && (
              <Notice warning>
                {state.attempt.failureReason ??
                  'The last payment did not go through.'}{' '}
                You haven’t been charged for it. You can try again.
              </Notice>
            )}
            <View>
              <Text className="mb-3 text-sm font-medium text-foreground">
                How do you want to pay?
              </Text>
              <View className="gap-2">
                {METHODS.map((entry) => {
                  const selected = entry === method;
                  return (
                    <Pressable
                      key={entry}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      onPress={() => setMethod(entry)}
                      className={`min-h-14 justify-center rounded-xl border px-4 py-3 ${selected ? 'border-primary bg-secondary' : 'border-border bg-card'}`}
                    >
                      <Text
                        className={`text-sm font-medium ${selected ? 'text-primary' : 'text-foreground'}`}
                      >
                        {methodLabels[entry]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <Field
              label="Phone number to charge"
              placeholder="0788 123 456"
              value={phoneValue}
              onChangeText={(text) => {
                setPhone(text);
                setError('');
              }}
              keyboardType="phone-pad"
              autoComplete="tel"
              maxLength={20}
            />
            <Text className="text-xs leading-5 text-muted-foreground">
              We’ll send a request to this number. You approve it on your phone
              with your Mobile Money PIN. We never ask for your PIN in the app.
            </Text>
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
        {state.kind === 'paid' ? (
          <Button
            label="Back to confirmation"
            icon="check"
            onPress={backToConfirmation}
          />
        ) : state.kind === 'pending' ? (
          <Button
            label="Back to confirmation"
            icon={null}
            secondary
            onPress={backToConfirmation}
          />
        ) : (
          <Button
            label={`Pay ${formatMoney(total)}`}
            loading={busy}
            onPress={() => void startPayment()}
          />
        )}
      </Footer>
    </Page>
  );
}