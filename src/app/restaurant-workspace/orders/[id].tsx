import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import {
  Button,
  EmptyState,
  Footer,
  Notice,
} from '../../../components/ui/primitives';
import { Text } from '../../../components/ui/Text';
import { formatMoney } from '../../../features/delivery/services';
import { useRestaurantWorkspace } from '../../../features/restaurant-workspace/RestaurantWorkspaceProvider';
import {
  advanceOrder,
  orderActionLabels,
  orderStatusLabels,
  orderSubtotal,
  rejectOrder,
  type RestaurantOrderStatus,
} from '../../../features/restaurant-workspace/model';
import {
  RestaurantField,
  RestaurantIntro,
  RestaurantPage,
  RestaurantPanel,
  RestaurantSection,
  RestaurantTag,
} from '../../../features/restaurant-workspace/ui';

const fulfilmentStages: RestaurantOrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'picked-up',
  'delivered',
  'completed',
];

export default function RestaurantOrderDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { workspace, update, saving } = useRestaurantWorkspace();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  const order = workspace?.orders.find((entry) => entry.id === id);
  if (!workspace || !order)
    return (
      <RestaurantPage title="Order details">
        <EmptyState
          title="Order unavailable"
          description="Return to the order queue and choose another order."
        />
      </RestaurantPage>
    );

  const action = orderActionLabels[order.status];
  const pending = order.status === 'pending';
  const currentStage = fulfilmentStages.indexOf(order.status);

  async function submitRejection() {
    const saved = await update((current) => rejectOrder(current, id, reason));
    if (saved) setRejecting(false);
  }

  return (
    <RestaurantPage
      title="Order details"
      footer={
        action && (
          <Footer>
            {rejecting ? (
              <>
                <Button
                  label="Reject order"
                  icon="close"
                  disabled={!reason.trim()}
                  loading={saving}
                  onPress={() => void submitRejection()}
                />
                <Button
                  label="Keep order"
                  icon={null}
                  secondary
                  disabled={saving}
                  onPress={() => setRejecting(false)}
                />
              </>
            ) : (
              <>
                <Button
                  label={action}
                  icon="check"
                  loading={saving}
                  onPress={() =>
                    void update((current) => advanceOrder(current, id))
                  }
                />
                {pending && (
                  <Button
                    label="Reject order"
                    icon={null}
                    secondary
                    disabled={saving}
                    onPress={() => setRejecting(true)}
                  />
                )}
              </>
            )}
          </Footer>
        )
      }
    >
      <RestaurantIntro
        eyebrow="RESTAURANT ORDER"
        title={order.id}
        description={order.customer}
      />

      <View className="gap-4">
        <RestaurantPanel>
          <RestaurantTag
            label={orderStatusLabels[order.status]}
            tone={
              pending
                ? 'warning'
                : order.status === 'ready'
                  ? 'success'
                  : 'neutral'
            }
          />
          <Text className="text-xs text-muted-foreground">
            Placed{' '}
            {new Date(order.placedAt).toLocaleString('en-GB', {
              timeZone: 'Africa/Kigali',
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </Text>
          {order.estimatedMinutes && (
            <Text className="text-xs text-muted-foreground">
              Estimated preparation: {order.estimatedMinutes} min
            </Text>
          )}
          {order.rejectionReason && (
            <Text className="text-sm text-foreground">
              {order.rejectionReason}
            </Text>
          )}
        </RestaurantPanel>

        <RestaurantPanel>
          <RestaurantSection icon="food" title="Items to prepare" />
          {order.lines.map((line, index) => (
            <View
              key={index}
              className="flex-row items-start gap-3 border-t border-border pt-3"
            >
              <Text className="flex-1 text-sm font-medium text-foreground">
                {line.quantity} × {line.name}
              </Text>
              <Text className="text-xs text-foreground">
                {formatMoney(line.quantity * line.unitPrice)}
              </Text>
            </View>
          ))}
          <View className="flex-row justify-between gap-3 border-t border-border pt-3">
            <Text className="text-sm text-muted-foreground">Items subtotal</Text>
            <Text className="text-sm font-medium text-foreground">
              {formatMoney(orderSubtotal(order))}
            </Text>
          </View>
        </RestaurantPanel>

        {pending && (
          <Notice>Confirm to begin preparation of this order.</Notice>
        )}
        {order.status === 'ready' && (
          <Notice>
            Ready for driver pickup. Pickup and delivery are handled by the
            shared delivery flow.
          </Notice>
        )}

        {currentStage >= 0 && (
          <RestaurantPanel>
            <RestaurantSection icon="activity" title="Fulfilment progress" />
            {fulfilmentStages.map((stage, index) => (
              <View key={stage} className="flex-row items-center gap-3">
                <View
                  className={`h-2.5 w-2.5 rounded-full ${index <= currentStage ? 'bg-primary' : 'bg-border'}`}
                />
                <Text
                  className={`flex-1 text-xs ${index === currentStage ? 'font-medium text-primary' : 'text-muted-foreground'}`}
                >
                  {orderStatusLabels[stage]}
                </Text>
                {index === currentStage && (
                  <RestaurantTag label="Current" tone="primary" />
                )}
              </View>
            ))}
          </RestaurantPanel>
        )}

        {rejecting && (
          <RestaurantField
            label="Reason for rejection"
            value={reason}
            onChangeText={setReason}
            placeholder="For example, kitchen is closed"
            multiline
            maxLength={240}
          />
        )}
      </View>
    </RestaurantPage>
  );
}
