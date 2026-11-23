import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from '../../../components/ui/Icon';
import { Text } from '../../../components/ui/Text';
import { Button, Field, Notice } from '../../../components/ui/primitives';
import { useNow } from '../../../hooks/useNow';
import { usePalette } from '../../../hooks/usePalette';
import { formatPhone } from '../../delivery/contact';
import { formatMoney } from '../../delivery/services';
import type { PhoneAnswer } from '../../payments/mockGateway';
import {
  methodLabels,
  pendingDeadline,
  type PaymentMethod,
} from '../../payments/payment';
import { usePayments } from '../../payments/PaymentProvider';
import { formatCountdown, paymentState } from '../../payments/view';
import { tipPaymentId } from '../sync';
import { tipError, type Trip } from '../trip';
import { TIP_PRESETS, parseTipInput } from '../view';

const METHODS = Object.keys(methodLabels) as PaymentMethod[];

// After the delivery is completed, the customer may tip the driver. The tip is
// paid through Mobile Money like the delivery, and counts toward the driver's
// earnings once the payment succeeds.
export function TipCard({
  trip,
  driverName,
}: {
  trip: Trip;
  driverName: string;
}) {
  const palette = usePalette();
  const { payments, pay, answer } = usePayments();
  const tipId = tipPaymentId(trip.requestId);
  const tipPayment = payments[tipId];
  const state = paymentState(tipPayment);
  const deadline = tipPayment ? pendingDeadline(tipPayment) : undefined;
  const now = useNow(deadline !== undefined);

  const [choice, setChoice] = useState<number | 'custom'>();
  const [customText, setCustomText] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('mtn_momo');
  const [phone, setPhone] = useState<string>();
  const [skipped, setSkipped] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (trip.tip !== undefined)
    return (
      <View className="mb-5 flex-row items-center gap-3 rounded-[20px] bg-success-muted p-5">
        <Icon name="check" size={18} color={palette.success} />
        <Text className="flex-1 text-sm text-foreground">
          Thank you. You tipped {driverName} {formatMoney(trip.tip)}.
        </Text>
      </View>
    );

  if (state.kind === 'paid')
    return (
      <View className="mb-5 rounded-[20px] bg-card p-5">
        <Text className="text-sm text-muted-foreground">
          Your tip was received. Adding it to {driverName}’s earnings…
        </Text>
      </View>
    );

  if (state.kind === 'pending') {
    const secondsLeft =
      deadline === undefined ? 0 : Math.ceil((deadline - now) / 1000);
    const reply = async (answerChoice: PhoneAnswer) => {
      setBusy(true);
      setError('');
      const result = await answer(tipId, answerChoice);
      if (!result.ok) setError(result.error);
      setBusy(false);
    };
    return (
      <View className="mb-5 gap-3">
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
        {!!error && <Notice warning>{error}</Notice>}
      </View>
    );
  }

  if (skipped)
    return (
      <View className="mb-5 rounded-[20px] bg-card p-5">
        <Text className="text-sm text-muted-foreground">
          No tip added. Thank you for rating your delivery.
        </Text>
      </View>
    );

  const amount =
    choice === 'custom' ? parseTipInput(customText) : choice;
  const lastPhone = payments[trip.requestId]?.attempts.at(-1)?.phone;
  const phoneValue =
    phone ?? (state.kind === 'failed' ? formatPhone(state.attempt.phone) : lastPhone ? formatPhone(lastPhone) : '');

  async function sendTip() {
    if (amount === undefined) {
      setError('Choose or enter a tip amount.');
      return;
    }
    const problem = tipError(amount);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError('');
    const result = await pay(tipId, amount, { method, phone: phoneValue });
    if (!result.ok) setError(result.error);
    setBusy(false);
  }

  return (
    <View className="mb-5 gap-4 rounded-[20px] bg-card p-5">
      <Text className="text-xs font-medium tracking-wider text-muted-foreground">
        TIP {driverName.toUpperCase()} (OPTIONAL)
      </Text>
      {state.kind === 'failed' && (
        <Notice warning>
          {state.attempt.failureReason ?? 'The last payment did not go through.'}{' '}
          You haven’t been charged for it. You can try again.
        </Notice>
      )}
      <View className="flex-row flex-wrap gap-2">
        {TIP_PRESETS.map((preset) => {
          const selected = choice === preset;
          return (
            <Pressable
              key={preset}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => {
                setChoice(preset);
                setError('');
              }}
              className={`min-h-12 justify-center rounded-xl border px-4 ${selected ? 'border-primary bg-secondary' : 'border-border bg-card'}`}
            >
              <Text
                className={`text-sm font-medium ${selected ? 'text-primary' : 'text-foreground'}`}
              >
                {formatMoney(preset)}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ checked: choice === 'custom' }}
          onPress={() => {
            setChoice('custom');
            setError('');
          }}
          className={`min-h-12 justify-center rounded-xl border px-4 ${choice === 'custom' ? 'border-primary bg-secondary' : 'border-border bg-card'}`}
        >
          <Text
            className={`text-sm font-medium ${choice === 'custom' ? 'text-primary' : 'text-foreground'}`}
          >
            Other
          </Text>
        </Pressable>
      </View>
      {choice === 'custom' && (
        <Field
          label="Tip amount (RWF)"
          placeholder="For example 1500"
          keyboardType="number-pad"
          value={customText}
          onChangeText={(text) => {
            setCustomText(text);
            setError('');
          }}
          maxLength={7}
        />
      )}
      {choice !== undefined && (
        <View className="gap-3">
          <View className="gap-2">
            {METHODS.map((entry) => {
              const selected = entry === method;
              return (
                <Pressable
                  key={entry}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  onPress={() => setMethod(entry)}
                  className={`min-h-12 justify-center rounded-xl border px-4 py-3 ${selected ? 'border-primary bg-secondary' : 'border-border bg-card'}`}
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
        </View>
      )}
      {!!error && (
        <Text accessibilityRole="alert" className="text-sm text-destructive">
          {error}
        </Text>
      )}
      <Button
        label={
          amount !== undefined && !tipError(amount)
            ? `Send ${formatMoney(amount)} tip`
            : 'Send tip'
        }
        loading={busy}
        disabled={choice === undefined}
        onPress={() => void sendTip()}
      />
      <Button
        secondary
        icon={null}
        label="No tip"
        disabled={busy}
        onPress={() => setSkipped(true)}
      />
    </View>
  );
}