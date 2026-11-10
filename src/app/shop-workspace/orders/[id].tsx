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
import { useShopWorkspace } from '../../../features/shop-workspace/ShopWorkspaceProvider';
import {
  advanceOrder,
  orderActionLabels,
  orderStatusLabels,
  orderSubtotal,
  rejectOrder,
  unavailableOrderLines,
  type ShopOrderStatus,
} from '../../../features/shop-workspace/model';
import {
  ShopField,
  ShopIntro,
  ShopPage,
  ShopPanel,
  ShopSection,
  ShopTag,
} from '../../../features/shop-workspace/ui';

const fulfilmentStages: ShopOrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'picked-up',
  'delivered',
  'completed',
];

export default function ShopOrderDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { workspace, update, saving } = useShopWorkspace();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const order = workspace?.orders.find((entry) => entry.id === id);
  if (!workspace || !order)
    return (
      <ShopPage title="Order details">
        <EmptyState
          title="Order unavailable"
          description="Return to the order queue and choose another order."
        />
      </ShopPage>
    );

  const action = orderActionLabels[order.status];
  const pending = order.status === 'pending';
  const unavailable = pending
    ? unavailableOrderLines(order, workspace.products)
    : [];
  const currentStage = fulfilmentStages.indexOf(order.status);

  async function submitRejection() {
    const saved = await update((current) => rejectOrder(current, id, reason));
    if (saved) setRejecting(false);
  }

  return (
    <ShopPage
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
                  disabled={unavailable.length > 0}
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
      <ShopIntro
        eyebrow="SHOP ORDER"
        title={order.id}
        description={order.customer}
      />
      <View className="gap-4">
        <ShopPanel>
          <ShopTag
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
          {order.rejectionReason && (
            <Text className="text-sm text-foreground">
              {order.rejectionReason}
            </Text>
          )}
        </ShopPanel>
        <ShopPanel>
          <ShopSection icon="parcel" title="Items to fulfil" />
          {order.lines.map((line, index) => (
            <View
              key={index}
              className="flex-row items-start gap-3 border-t border-border pt-3"
            >
              <View className="flex-1">
                <Text className="text-sm font-medium text-foreground">
                  {line.quantity} × {line.name}
                </Text>
                {pending && (
                  <Text
                    className={`mt-1 text-xs ${unavailable.includes(line) ? 'text-destructive' : 'text-muted-foreground'}`}
                  >
                    {unavailable.includes(line)
                      ? 'Insufficient stock'
                      : 'Available'}
                  </Text>
                )}
              </View>
              <Text className="text-xs text-foreground">
                {formatMoney(line.quantity * line.unitPrice)}
              </Text>
            </View>
          ))}
          <View className="flex-row justify-between gap-3 border-t border-border pt-3">
            <Text className="text-sm text-muted-foreground">
              Items subtotal
            </Text>
            <Text className="text-sm font-medium text-foreground">
              {formatMoney(orderSubtotal(order))}
            </Text>
          </View>
        </ShopPanel>
        {unavailable.length > 0 && (
          <Notice warning>
            Review the unavailable items and update inventory before confirming,
            or reject this order.
          </Notice>
        )}
        {pending && !unavailable.length && (
          <Notice>
            Confirming reserves the requested quantities from this preview
            catalogue.
          </Notice>
        )}
        {order.status === 'ready' && (
          <Notice>
            Ready for driver pickup. Pickup and delivery updates are handled by
            the delivery flow.
          </Notice>
        )}
        {currentStage >= 0 && (
          <ShopPanel>
            <ShopSection icon="activity" title="Fulfilment progress" />
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
                  <ShopTag label="Current" tone="primary" />
                )}
              </View>
            ))}
          </ShopPanel>
        )}
        {rejecting && (
          <ShopField
            label="Reason for rejection"
            value={reason}
            onChangeText={setReason}
            placeholder="For example, a product is unavailable"
            multiline
            maxLength={240}
          />
        )}
      </View>
    </ShopPage>
  );
}
