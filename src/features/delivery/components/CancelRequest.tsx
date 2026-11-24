import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Text } from '../../../components/ui/Text';
import { Button, Notice } from '../../../components/ui/primitives';
import { useNegotiation } from '../../negotiation/NegotiationProvider';
import { isPaid, openAttempt } from '../../payments/payment';
import { usePayments } from '../../payments/PaymentProvider';
import { useDelivery } from '../DeliveryProvider';
import { recordShopTracking } from '../shopTracking';

export function CancelRequest({
  requestId,
  disabled = false,
}: {
  requestId: string;
  disabled?: boolean;
}) {
  const { remove, requests, update } = useDelivery();
  const { discard } = useNegotiation();
  const { payments, discard: discardPayment } = usePayments();
  const payment = payments[requestId];
  const shopBooking =
    requests.find((request) => request.id === requestId)?.bookingSource === 'shop';
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function cancel() {
    setBusy(true);
    setError('');
    try {
      if (shopBooking) {
        await update(requestId, (request) =>
          recordShopTracking(request, 'cancelled'),
        );
      } else {
        await discard(requestId);
        await discardPayment(requestId);
        await remove(requestId);
        router.replace('/');
      }
    } catch {
      setError('Could not cancel this request. Please try again.');
      setBusy(false);
    }
  }
  // Money has moved, or is about to. Deleting the request would lose the record
  // of it, and there is no refund yet, so the request stays.
  if (payment && isPaid(payment))
    return (
      <Notice>
        This request is paid, so it can’t be cancelled here. Cancelling a paid
        request needs a refund, which isn’t available yet.
      </Notice>
    );
  if (payment && openAttempt(payment))
    return (
      <Notice>
        A payment is waiting for approval on your phone. You can cancel once it
        is answered or expires.
      </Notice>
    );

  if (!confirming)
    return (
      <Button
        label="Cancel request"
        icon="close"
        secondary
        disabled={disabled}
        onPress={() => setConfirming(true)}
      />
    );

  return (
    <View className="gap-3 rounded-[20px] bg-card p-5">
      <Text className="text-base font-bold text-foreground">
        Cancel this request?
      </Text>
      <Text className="text-sm leading-6 text-muted-foreground">
        {shopBooking
          ? 'You’ll still be able to view this cancelled booking in your shop’s history.'
          : 'Your request and any driver offers will be deleted. This can’t be undone.'}
      </Text>
      <Button
        label="Yes, cancel request"
        icon="close"
        loading={busy}
        disabled={disabled}
        onPress={() => void cancel()}
      />
      <Button
        label="Keep request"
        icon={null}
        secondary
        disabled={busy}
        onPress={() => {
          setError('');
          setConfirming(false);
        }}
      />
      {!!error && (
        <Text accessibilityRole="alert" className="text-sm text-destructive">
          {error}
        </Text>
      )}
    </View>
  );
}
