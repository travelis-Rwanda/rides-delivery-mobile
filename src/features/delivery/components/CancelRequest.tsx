import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Text } from '../../../components/ui/Text';
import { Button } from '../../../components/ui/primitives';
import { useNegotiation } from '../../negotiation/NegotiationProvider';
import { useDelivery } from '../DeliveryProvider';

// Cancel a request at any point before it is confirmed. Two taps, so it
// cannot happen by accident, and it works on web where Alert.alert does not.
export function CancelRequest({ requestId }: { requestId: string }) {
  const { remove } = useDelivery();
  const { discard } = useNegotiation();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function cancel() {
    setBusy(true);
    setError('');
    try {
      await discard(requestId); // offers and any agreed fare
      await remove(requestId); // the request itself
      router.replace('/');
    } catch {
      setError('Could not cancel this request. Please try again.');
      setBusy(false);
    }
  }

  if (!confirming)
    return (
      <Button
        label="Cancel request"
        icon="close"
        secondary
        onPress={() => setConfirming(true)}
      />
    );

  return (
    <View className="gap-3 rounded-[20px] bg-card p-5">
      <Text className="text-base font-bold text-foreground">
        Cancel this request?
      </Text>
      <Text className="text-sm leading-6 text-muted-foreground">
        Your request and any driver offers will be deleted. This can’t be
        undone.
      </Text>
      <Button
        label="Yes, cancel request"
        icon="close"
        loading={busy}
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