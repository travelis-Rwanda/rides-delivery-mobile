import { router } from 'expo-router';
import { View } from 'react-native';

import { Icon } from '../../../components/ui/Icon';
import { Text } from '../../../components/ui/Text';
import { Button, Notice } from '../../../components/ui/primitives';
import { usePalette } from '../../../hooks/usePalette';
import type { DeliveryRequest } from '../../delivery/model';
import { formatMoney } from '../../delivery/services';
import { useNegotiation } from '../../negotiation/NegotiationProvider';
import { requestPricing } from '../../pricing/forRequest';
import { usePayments } from '../PaymentProvider';
import { paymentState, payableTotal, receiptRows } from '../view';

// The payment part of the confirmation screen: what is owed, what to do next,
// or the receipt once it is paid. It also says whether the customer has been
// charged, so the screen never contradicts the money.
export function PaymentSection({ request }: { request: DeliveryRequest }) {
  const palette = usePalette();
  const { negotiations } = useNegotiation();
  const { payments } = usePayments();

  const total = payableTotal(requestPricing(request, negotiations[request.id]));
  const state = paymentState(payments[request.id]);

  const openPayment = () =>
    router.push({ pathname: '/payment/[id]', params: { id: request.id } });

  // Nothing to pay yet: restaurant and shop orders, or no agreed fare.
  if (total === undefined)
    return (
      <Notice>
        No request has been sent, no driver has been booked, and you haven’t
        been charged. You can revisit or edit this preview in Activity.
      </Notice>
    );

  if (state.kind === 'paid')
    return (
      <View className="gap-4">
        <View className="gap-3 rounded-[20px] bg-success-muted p-5">
          <View className="flex-row items-center gap-2">
            <Icon name="check" size={18} color={palette.success} />
            <Text className="text-xs font-medium tracking-wider text-foreground">
              PAID
            </Text>
          </View>
          {receiptRows(state.attempt).map((row) => (
            <View key={row.label} className="flex-row justify-between gap-3">
              <Text className="text-sm text-muted-foreground">{row.label}</Text>
              <Text className="flex-1 text-right text-sm text-foreground">
                {row.value}
              </Text>
            </View>
          ))}
        </View>
        <Notice>
          Your payment was received. A paid request can’t be edited or cancelled
          yet.
        </Notice>
      </View>
    );

  if (state.kind === 'pending')
    return (
      <View className="gap-4">
        <View className="gap-2 rounded-[20px] bg-card p-5">
          <Text className="text-xs font-medium tracking-wider text-muted-foreground">
            PAYMENT
          </Text>
          <Text className="text-base font-bold text-foreground">
            Waiting for approval on your phone
          </Text>
          <Text className="text-sm leading-6 text-muted-foreground">
            A request for {formatMoney(total)} is waiting for you.
          </Text>
        </View>
        <Button label="Open payment" onPress={openPayment} />
      </View>
    );

  return (
    <View className="gap-4">
      <View className="gap-2 rounded-[20px] bg-card p-5">
        <Text className="text-xs font-medium tracking-wider text-muted-foreground">
          TO PAY
        </Text>
        <Text className="text-[26px] font-bold tracking-tight text-foreground">
          {formatMoney(total)}
        </Text>
        <Text className="text-sm leading-6 text-muted-foreground">
          Pay with MTN Mobile Money or Airtel Money.
        </Text>
      </View>
      {state.kind === 'failed' && (
        <Notice warning>
          {state.attempt.failureReason ?? 'The last payment did not go through.'}
        </Notice>
      )}
      <Button
        label={
          state.kind === 'failed' ? 'Try paying again' : 'Pay with Mobile Money'
        }
        onPress={openPayment}
      />
      <Notice>
        You haven’t been charged yet. You can revisit or edit this preview in
        Activity until you pay.
      </Notice>
    </View>
  );
}