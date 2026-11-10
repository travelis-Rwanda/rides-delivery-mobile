import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Text } from '../../components/ui/Text';

import { Icon } from '../../components/ui/Icon';
import {
  Button,
  EmptyState,
  Footer,
  Header,
  Notice,
  Page,
  PageScroll,
  StepIndicator,
} from '../../components/ui/primitives';
import { useDelivery } from '../../features/delivery/DeliveryProvider';
import { previewEstimate, selectedItems } from '../../features/delivery/model';
import {
  formatMoney,
  getService,
  stockLimit,
} from '../../features/delivery/services';
import { usePalette } from '../../hooks/usePalette';
import { CatalogImage } from '../../features/merchants/components/CatalogImage';
import { getMerchant } from '../../features/merchants/catalog';
import { RoadRouteCard } from '../../features/maps/components/RoadRouteCard';
import { routeKey, type RoadRoute } from '../../features/maps/places';

export default function ReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { requests, loading, save, loadError, reload } = useDelivery();
  const palette = usePalette();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [calculatedRoute, setCalculatedRoute] = useState<{
    key: string;
    route: RoadRoute;
  }>();
  const request = requests.find((entry) => entry.id === id);
  if (loading)
    return (
      <Page>
        <Header title="Review request" />
        <ActivityIndicator
          accessibilityLabel="Loading request"
          color={palette.primary}
        />
      </Page>
    );
  if (!request)
    return (
      <Page>
        <Header title="Review request" />
        <PageScroll>
          <EmptyState
            title={
              loadError ? 'Couldn’t load your request' : 'Request not found'
            }
            description={
              loadError
                ? 'Try loading your saved requests again.'
                : 'It may belong to another device. Start a new request to continue.'
            }
          >
            <Button
              label={loadError ? 'Try again' : 'Explore services'}
              onPress={() => (loadError ? void reload() : router.replace('/'))}
            />
          </EmptyState>
        </PageScroll>
      </Page>
    );
  const service = getService(request.service)!;
  const estimate = previewEstimate(request);
  const items = selectedItems(request);
  const needsStockUpdate =
    !request.previewConfirmed &&
    items.some((item) => item.quantity > stockLimit(item));
  const merchant = getMerchant(request.merchantId, request.service);
  const pickupPoint = request.pickupPoint ?? merchant?.location;
  const deliveryPoint = request.destinationPoint;
  const tripKey =
    pickupPoint && deliveryPoint
      ? `${request.id}:${routeKey(pickupPoint, deliveryPoint)}`
      : undefined;
  const roadRoute =
    calculatedRoute && calculatedRoute.key === tripKey
      ? calculatedRoute.route
      : request.roadRoute;

  async function confirm() {
    if (!request || needsStockUpdate) return;
    setSaving(true);
    setError('');
    try {
      await save({
        ...request,
        pickupPoint,
        roadRoute,
        previewConfirmed: true,
      });
      router.replace({
        pathname: '/confirmed/[id]',
        params: { id: request.id },
      });
    } catch {
      setError('Your preview could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page>
      <Header title="Review request" />
      <PageScroll>
        <StepIndicator step={3} />
        <Text className="text-[10px] font-bold tracking-[1.5px] text-primary">
          ONE LAST LOOK
        </Text>
        <Text
          accessibilityRole="header"
          className="mt-2 text-[26px] font-medium leading-[35px] tracking-[-0.7px] text-foreground"
        >
          Review your delivery.
        </Text>
        <Text className="mb-6 mt-3 text-sm leading-6 text-muted-foreground">
          Check the details before you continue.
        </Text>
        <View className="mb-4 overflow-hidden rounded-[20px] bg-card">
          <View className="flex-row items-center gap-3 border-b border-border p-4">
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-secondary">
              <Icon name={service.icon} color={palette.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-foreground">
                {request.parcelDirection === 'receive'
                  ? 'Receive a parcel'
                  : request.parcelDirection === 'send'
                    ? 'Send a parcel'
                    : service.label}
              </Text>
              <Text className="mt-0.5 text-xs text-muted-foreground">
                {request.method === 'collection'
                  ? 'Collection point drop-off'
                  : request.service === 'parcel' || request.service === 'cargo'
                    ? `${request.size} · Driver pickup`
                    : `${items.reduce((sum, item) => sum + item.quantity, 0)} items · Door delivery`}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit request"
              onPress={() =>
                router.push({
                  pathname: '/delivery/[service]',
                  params: { service: request.service, id: request.id },
                })
              }
              className="h-11 w-11 items-center justify-center rounded-full bg-muted"
            >
              <Icon name="edit" color={palette.primary} size={19} />
            </Pressable>
          </View>
          <View className="gap-5 p-5">
            <View className="flex-row items-start gap-3">
              <View className="mt-1.5 h-3 w-3 rounded-full border-[3px] border-primary" />
              <View className="flex-1">
                <Text className="mb-1 text-[10px] font-bold tracking-wider text-muted-foreground">
                  {request.service === 'restaurant' ||
                  request.service === 'shop'
                    ? 'FROM'
                    : 'PICKUP'}
                </Text>
                <Text className="text-sm font-medium leading-5 text-foreground">
                  {request.pickup}
                </Text>
                {merchant && (
                  <Text className="mt-1 text-xs text-muted-foreground">
                    {merchant.location.label}
                  </Text>
                )}
              </View>
            </View>
            <View className="flex-row items-start gap-3">
              <Icon name="pin" size={15} color={palette.success} />
              <View className="flex-1">
                <Text className="mb-1 text-[10px] font-bold tracking-wider text-muted-foreground">
                  DELIVER TO
                </Text>
                <Text className="text-sm font-medium leading-5 text-foreground">
                  {request.destination}
                </Text>
              </View>
            </View>
            {!!request.description && (
              <View className="border-t border-border pt-4">
                <Text className="mb-1 text-xs text-muted-foreground">
                  What’s inside
                </Text>
                <Text className="text-sm leading-5 text-foreground">
                  {request.description}
                </Text>
              </View>
            )}
            {!!request.notes && (
              <View>
                <Text className="mb-1 text-xs text-muted-foreground">
                  Delivery notes
                </Text>
                <Text className="text-sm leading-5 text-foreground">
                  {request.notes}
                </Text>
              </View>
            )}
          </View>
        </View>
        {pickupPoint && deliveryPoint && tripKey && (
          <View className="mb-4">
            <RoadRouteCard
              key={tripKey}
              pickup={pickupPoint}
              delivery={deliveryPoint}
              route={roadRoute}
              onRoute={(route) => setCalculatedRoute({ key: tripKey, route })}
            />
          </View>
        )}
        {items.length > 0 && (
          <View className="mb-4 gap-4 rounded-[20px] bg-card p-5">
            <Text className="text-base font-bold text-foreground">
              Your basket
            </Text>
            {items.map((item) => (
              <View key={item.id} className="flex-row items-start gap-3">
                <CatalogImage
                  imageKey={item.imageKey}
                  previewLabel={item.name}
                  style={{ width: 44, height: 44, borderRadius: 10 }}
                />
                <View className="h-7 w-7 items-center justify-center rounded-lg bg-muted">
                  <Text className="text-xs font-medium text-foreground">
                    {item.quantity}×
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm leading-6 text-foreground">
                    {item.name}
                  </Text>
                  {needsStockUpdate && item.quantity > stockLimit(item) && (
                    <Text className="text-xs font-medium text-destructive">
                      {stockLimit(item) === 0
                        ? 'Out of stock'
                        : 'Reduce quantity to continue'}
                    </Text>
                  )}
                </View>
                <Text className="text-sm leading-6 text-muted-foreground">
                  {formatMoney(item.price * item.quantity)}
                </Text>
              </View>
            ))}
            {needsStockUpdate && (
              <Text
                accessibilityRole="alert"
                className="text-xs leading-5 text-destructive"
              >
                Edit your basket to match available stock before confirming.
              </Text>
            )}
          </View>
        )}
        <View className="mb-4 rounded-[20px] bg-card p-5">
          <View className="mb-5 flex-row items-center justify-between">
            <Text className="text-base font-bold text-foreground">
              Estimated cost
            </Text>
            <View className="rounded-full bg-warning-muted px-2.5 py-1">
              <Text className="text-[10px] font-medium text-foreground">
                SAMPLE ONLY
              </Text>
            </View>
          </View>
          <View className="gap-3">
            {[
              {
                label: 'Items',
                amount: estimate.subtotal,
                show: items.length > 0,
              },
              {
                label: 'Driver transport fare',
                amount: estimate.transport,
                show: true,
              },
              {
                label: 'Platform service fee',
                amount: estimate.serviceFee,
                show: true,
              },
            ]
              .filter((row) => row.show)
              .map((row) => (
                <View
                  key={row.label}
                  className="flex-row justify-between gap-3"
                >
                  <Text className="flex-1 text-sm text-muted-foreground">
                    {row.label}
                  </Text>
                  <Text className="text-sm font-medium text-foreground">
                    {formatMoney(row.amount)}
                  </Text>
                </View>
              ))}
          </View>
          <View className="mt-5 flex-row items-center justify-between border-t border-border pt-4">
            <Text className="text-base font-bold text-foreground">
              Estimated total
            </Text>
            <Text className="text-xl font-bold tracking-tight text-primary">
              {formatMoney(estimate.total)}
            </Text>
          </View>
        </View>
        <Notice warning>
          These are illustrative amounts, not a live quote. Final charges and
          any applicable taxes will be shown before a real booking. For parcel
          and cargo, approve the driver’s final fare before payment.
        </Notice>
        {!!error && (
          <Text
            accessibilityRole="alert"
            className="mt-4 text-sm text-destructive"
          >
            {error}
          </Text>
        )}
      </PageScroll>
      <Footer>
        <Button
          label={
            request.previewConfirmed
              ? 'View confirmed preview'
              : 'Confirm preview'
          }
          onPress={() =>
            request.previewConfirmed && roadRoute === request.roadRoute
              ? router.replace({
                  pathname: '/confirmed/[id]',
                  params: { id: request.id },
                })
              : void confirm()
          }
          loading={saving}
          disabled={needsStockUpdate}
          icon="check"
        />
        <Text className="text-center text-xs leading-5 text-muted-foreground">
          Saved on this device. No booking or payment.
        </Text>
      </Footer>
    </Page>
  );
}
