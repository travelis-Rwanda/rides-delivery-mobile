import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Text } from '../../components/ui/Text';

import { Icon } from '../../components/ui/Icon';
import {
  Button,
  EmptyState,
  Field,
  Footer,
  Header,
  Notice,
  Page,
  PageScroll,
  StepIndicator,
} from '../../components/ui/primitives';
import { useDelivery } from '../../features/delivery/DeliveryProvider';
import { AddressField } from '../../features/delivery/components/AddressField';
import {
  selectedItems,
  validateRequest,
  type DeliveryRequest,
  type ParcelDirection,
} from '../../features/delivery/model';
import {
  formatMoney,
  getService,
  previewCatalog,
  type Service,
} from '../../features/delivery/services';
import { usePalette } from '../../hooks/usePalette';
import {
  getMerchant,
  sameMerchantBasket,
  isMerchantService,
  type Merchant,
} from '../../features/merchants/catalog';
import { useMerchantCart } from '../../features/merchants/MerchantCartProvider';
import { CatalogImage } from '../../features/merchants/components/CatalogImage';
import { RoadRouteCard } from '../../features/maps/components/RoadRouteCard';
import {
  routeKey,
  type Coordinate,
  type Place,
} from '../../features/maps/places';

export default function ServiceRoute() {
  const {
    service: serviceId,
    id,
    merchant: merchantId,
    direction,
  } = useLocalSearchParams<{
    service: string;
    id?: string;
    merchant?: string;
    direction?: string;
  }>();
  const service = getService(serviceId);
  const { requests, loading } = useDelivery();
  if (!service)
    return (
      <Page>
        <Header title="Delivery service" />
        <PageScroll>
          <EmptyState
            title="Service not found"
            description="Choose one of our delivery services to get started."
          >
            <Button
              label="Explore services"
              onPress={() => router.replace('/')}
            />
          </EmptyState>
        </PageScroll>
      </Page>
    );
  const existing = requests.find(
    (entry) => entry.id === id && entry.service === service.id,
  );
  if (id && loading)
    return (
      <Page>
        <Header title="Your request" />
        <ActivityIndicator accessibilityLabel="Loading request" />
      </Page>
    );
  if (id && !existing)
    return (
      <Page>
        <Header title="Your request" />
        <PageScroll>
          <EmptyState
            title="Request not found"
            description="Open a saved request from Activity, or start a new one."
          >
            <Button
              label="Open Activity"
              onPress={() => router.replace('/activity')}
            />
          </EmptyState>
        </PageScroll>
      </Page>
    );
  const selectedMerchantId = existing?.merchantId ?? merchantId;
  const merchant = getMerchant(selectedMerchantId, service.id);
  if (selectedMerchantId && !merchant)
    return (
      <Page>
        <Header title="Business unavailable" />
        <PageScroll>
          <EmptyState
            title="Let’s choose another business"
            description="This business is not available for the selected service."
          >
            <Button
              label="Explore businesses"
              onPress={() =>
                router.replace({
                  pathname: '/browse/[service]',
                  params: { service: service.id },
                })
              }
            />
          </EmptyState>
        </PageScroll>
      </Page>
    );
  if (isMerchantService(service.id) && !merchant && !existing)
    return (
      <Redirect
        href={{
          pathname: '/browse/[service]',
          params: { service: service.id },
        }}
      />
    );
  const parcelDirection: ParcelDirection | undefined =
    service.id === 'parcel'
      ? (existing ? existing.parcelDirection : direction) === 'receive'
        ? 'receive'
        : 'send'
      : undefined;
  return (
    <ServiceForm
      key={`${service.id}-${merchant?.id ?? parcelDirection ?? 'standard'}-${existing?.id ?? 'new'}`}
      service={service}
      existing={existing}
      merchant={merchant}
      parcelDirection={parcelDirection}
    />
  );
}

function ServiceForm({
  service,
  existing,
  merchant,
  parcelDirection,
}: {
  service: Service;
  existing?: DeliveryRequest;
  merchant?: Merchant;
  parcelDirection?: ParcelDirection;
}) {
  const palette = usePalette();
  const { save, loading, loadError } = useDelivery();
  const merchantOrder = service.id === 'restaurant' || service.id === 'shop';
  const receiving = parcelDirection === 'receive';
  const cart = useMerchantCart(
    merchant?.id,
    existing?.id,
    existing?.quantities,
  );
  const catalog =
    service.id === 'restaurant' || service.id === 'shop'
      ? previewCatalog[service.id]
      : [];
  const [details, setForm] = useState<DeliveryRequest>(() =>
    existing
      ? {
          ...existing,
          pickupPoint: existing.pickupPoint ?? merchant?.location,
        }
      : {
          id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
          service: service.id,
          ...(merchant ? { merchantId: merchant.id } : {}),
          ...(parcelDirection ? { parcelDirection } : {}),
          pickup: merchantOrder
            ? (merchant?.name ??
              (service.id === 'restaurant'
                ? 'Sample restaurant'
                : 'Sample shop'))
            : '',
          pickupPoint: merchant?.location,
          destination: '',
          description: '',
          method: 'pickup',
          size: 'Small',
          notes: '',
          quantities: merchant ? { ...cart.quantities } : {},
          createdAt: new Date().toISOString(),
          previewConfirmed: false,
        },
  );
  const form = merchant
    ? {
        ...details,
        quantities: cart.quantities,
        previewConfirmed:
          details.previewConfirmed &&
          sameMerchantBasket(merchant, details.quantities, cart.quantities),
      }
    : details;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [alternatePickup, setAlternatePickup] = useState<{
    label: string;
    point?: Coordinate;
  }>({ label: '' });
  const basket = selectedItems(form);
  const tripKey =
    form.pickupPoint && form.destinationPoint
      ? routeKey(form.pickupPoint, form.destinationPoint)
      : undefined;

  function update<K extends keyof DeliveryRequest>(
    key: K,
    value: DeliveryRequest[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
      previewConfirmed: false,
    }));
    setErrors((current) => ({ ...current, [key]: '' }));
  }

  function changePickupMethod(method: DeliveryRequest['method']) {
    if (method === form.method) return;
    setAlternatePickup({ label: form.pickup, point: form.pickupPoint });
    setForm((current) => ({
      ...current,
      method,
      pickup: alternatePickup.label,
      pickupPoint: alternatePickup.point,
      roadRoute: undefined,
      previewConfirmed: false,
    }));
    setErrors((current) => ({ ...current, pickup: '', destination: '' }));
  }

  function changeAddress(
    stop: 'pickup' | 'destination',
    value: string | Place,
  ) {
    const label =
      typeof value === 'string'
        ? value
        : [value.label, value.detail].filter(Boolean).join(', ').slice(0, 200);
    const point =
      typeof value === 'string'
        ? undefined
        : { latitude: value.latitude, longitude: value.longitude };
    const pointKey = stop === 'pickup' ? 'pickupPoint' : 'destinationPoint';
    setForm((current) => ({
      ...current,
      [stop]: label,
      [pointKey]: point,
      roadRoute: undefined,
      previewConfirmed: false,
    }));
    setErrors((current) => ({ ...current, [stop]: '' }));
  }

  async function review() {
    const nextErrors = validateRequest(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSaving(true);
    setSaveError('');
    try {
      await save({
        ...form,
        pickup: form.pickup.trim(),
        destination: form.destination.trim(),
        description: form.description.trim(),
      });
      router.push({ pathname: '/request/[id]', params: { id: form.id } });
    } catch {
      setSaveError(
        loadError
          ? 'Your saved requests could not be loaded. Open Activity and try again before saving.'
          : 'We couldn’t save this request. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page avoidKeyboard>
      <Header
        title={
          parcelDirection
            ? receiving
              ? 'Receive a parcel'
              : 'Send a parcel'
            : merchant
              ? 'Delivery details'
              : service.label
        }
      />
      <PageScroll>
        <StepIndicator step={2} />
        <View className="mb-6">
          <View className="flex-1">
            <Text className="mb-2 text-[10px] font-bold tracking-[1.5px] text-primary">
              {service.eyebrow}
            </Text>
            <Text
              accessibilityRole="header"
              className="text-[26px] font-medium leading-[35px] tracking-[-0.7px] text-foreground"
            >
              {merchant
                ? 'Good choices.\nWhere to next?'
                : merchantOrder
                  ? service.id === 'restaurant'
                    ? 'Something delicious?'
                    : 'The everyday essentials.'
                  : 'Let’s plan your delivery.'}
            </Text>
            <Text className="mt-2 text-[12px] leading-5 text-muted-foreground">
              {receiving
                ? 'Tell us where to collect the parcel and where to bring it.'
                : merchant
                  ? `Your basket from ${merchant.name}.`
                  : service.description}
            </Text>
          </View>
        </View>
        <View className="mb-6">
          <Notice>
            Try the complete flow with a preview request. No driver is booked
            and no payment is taken.
          </Notice>
        </View>

        {merchantOrder && merchant ? (
          <View className="mb-6 rounded-[22px] bg-card p-4">
            <View className="mb-4 flex-row items-center justify-between gap-2">
              <View className="flex-1">
                <Text className="text-[14px] font-medium text-foreground">
                  Your basket
                </Text>
                <Text className="mt-1 text-[11px] text-muted-foreground">
                  {merchant.name}
                </Text>
                <Text className="mt-1 text-[11px] text-muted-foreground">
                  {merchant.location.label}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Edit basket"
                onPress={() => {
                  router.push({
                    pathname: '/merchant/[id]',
                    params: {
                      id: merchant.id,
                      edit: '1',
                      ...(existing ? { request: existing.id } : {}),
                    },
                  });
                }}
                className="min-h-11 justify-center px-3"
              >
                <Text className="text-[12px] font-medium text-primary">
                  Edit
                </Text>
              </Pressable>
            </View>
            {basket.map((item) => (
              <View key={item.id} className="mb-3 flex-row items-center gap-3">
                <CatalogImage
                  imageKey={item.imageKey}
                  style={{ width: 56, height: 56, borderRadius: 12 }}
                />
                <View className="flex-1">
                  <Text className="text-[12px] font-medium leading-[18px] text-foreground">
                    {item.name}
                  </Text>
                  <Text className="mt-1 text-[10px] text-muted-foreground">
                    Qty {item.quantity}
                  </Text>
                </View>
                <Text className="text-[11px] font-medium text-foreground">
                  {formatMoney(item.price * item.quantity)}
                </Text>
              </View>
            ))}
            {!basket.length && (
              <Text className="mb-3 text-[12px] text-muted-foreground">
                Your basket is empty. Tap Edit to choose your items.
              </Text>
            )}
            <View className="mt-1 flex-row justify-between border-t border-border pt-4">
              <Text className="text-[12px] text-muted-foreground">
                Items subtotal
              </Text>
              <Text className="text-[13px] font-medium text-foreground">
                {formatMoney(
                  basket.reduce(
                    (total, item) => total + item.price * item.quantity,
                    0,
                  ),
                )}
              </Text>
            </View>
            {!!errors.items && (
              <Text
                accessibilityRole="alert"
                className="mt-3 text-[12px] text-destructive"
              >
                {errors.items}
              </Text>
            )}
          </View>
        ) : merchantOrder ? (
          <View className="mb-6 gap-3">
            <View className="mb-1 flex-row items-center justify-between">
              <Text
                accessibilityRole="header"
                className="text-lg font-bold text-foreground"
              >
                {service.id === 'restaurant'
                  ? 'Sample menu'
                  : 'Sample collection'}
              </Text>
              <View className="rounded-full bg-secondary px-3 py-1">
                <Text className="text-[10px] font-bold text-primary">
                  ILLUSTRATIVE PRICES
                </Text>
              </View>
            </View>
            {catalog.map((item) => {
              const quantity = form.quantities[item.id] ?? 0;
              const changeQuantity = (amount: number) => {
                update('quantities', {
                  ...form.quantities,
                  [item.id]: Math.max(0, Math.min(20, quantity + amount)),
                });
                setErrors((current) => ({ ...current, items: '' }));
              };
              return (
                <View key={item.id} className="rounded-[16px] bg-card p-4">
                  <View className="flex-row items-start gap-3">
                    <CatalogImage
                      imageKey={item.imageKey}
                      style={{ width: 72, height: 72, borderRadius: 14 }}
                    />
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-foreground">
                        {item.name}
                      </Text>
                      <Text className="mt-1 text-xs leading-5 text-muted-foreground">
                        {item.description}
                      </Text>
                    </View>
                  </View>
                  <View className="mt-3 flex-row items-center justify-between">
                    <Text className="text-sm font-bold text-foreground">
                      {formatMoney(item.price)}
                    </Text>
                    <View className="flex-row items-center gap-2">
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Remove one ${item.name}`}
                        disabled={quantity === 0}
                        accessibilityState={{ disabled: quantity === 0 }}
                        onPress={() => changeQuantity(-1)}
                        className={`h-11 w-11 items-center justify-center rounded-xl bg-muted active:opacity-60 ${quantity === 0 ? 'opacity-30' : ''}`}
                      >
                        <Icon
                          name="minus"
                          size={17}
                          color={palette.foreground}
                        />
                      </Pressable>
                      <Text
                        accessibilityLabel={`${quantity} ${item.name}`}
                        className="min-w-5 text-center text-sm font-bold text-foreground"
                      >
                        {quantity}
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Add one ${item.name}`}
                        disabled={quantity === 20}
                        accessibilityState={{ disabled: quantity === 20 }}
                        onPress={() => changeQuantity(1)}
                        className={`h-11 w-11 items-center justify-center rounded-xl bg-secondary active:opacity-60 ${quantity === 20 ? 'opacity-30' : ''}`}
                      >
                        <Icon name="plus" size={17} color={palette.primary} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })}
            {!!errors.items && (
              <Text
                accessibilityRole="alert"
                className="text-sm text-destructive"
              >
                {errors.items}
              </Text>
            )}
          </View>
        ) : (
          <View className="mb-6 gap-5">
            <View>
              <Text
                accessibilityRole="header"
                className="mb-3 text-lg font-bold text-foreground"
              >
                {service.id === 'cargo' ? 'Your load' : 'Your parcel'}
              </Text>
              <Field
                label={
                  receiving
                    ? 'What are you receiving?'
                    : 'What are you sending?'
                }
                placeholder={
                  service.id === 'cargo'
                    ? 'e.g. Furniture, 3 pieces'
                    : 'e.g. Documents, a gift, clothing'
                }
                value={form.description}
                onChangeText={(text) => update('description', text)}
                error={errors.description}
                maxLength={300}
              />
            </View>
            <View>
              <Text className="mb-3 text-sm font-medium text-foreground">
                {service.id === 'cargo' ? 'Load size' : 'Parcel size'}
              </Text>
              <View className="flex-row gap-2">
                {(['Small', 'Medium', 'Large'] as const).map((size) => (
                  <Pressable
                    key={size}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: form.size === size }}
                    onPress={() => update('size', size)}
                    className={`min-h-12 flex-1 items-center justify-center rounded-xl border px-2 py-3 ${form.size === size ? 'border-primary bg-secondary' : 'border-border bg-card'}`}
                  >
                    <Text
                      className={`text-sm font-medium ${form.size === size ? 'text-primary' : 'text-muted-foreground'}`}
                    >
                      {size}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text className="mt-2 text-xs leading-5 text-muted-foreground">
                {service.id === 'cargo'
                  ? 'Vehicle suitability and load dimensions are confirmed before booking.'
                  : 'Size helps plan your request. Final transport fare requires an approved driver offer.'}
              </Text>
            </View>
            {service.id === 'parcel' && (
              <View>
                <Text className="mb-3 text-sm font-medium text-foreground">
                  {receiving
                    ? 'How will the sender hand it over?'
                    : 'How should it start?'}
                </Text>
                <View className="flex-row gap-2">
                  {(
                    [
                      {
                        value: 'pickup',
                        label: 'Driver pickup',
                        icon: 'cargo',
                      },
                      {
                        value: 'collection',
                        label: 'Collection point',
                        icon: 'pin',
                      },
                    ] as const
                  ).map((method) => (
                    <Pressable
                      key={method.value}
                      accessibilityRole="radio"
                      accessibilityState={{
                        checked: form.method === method.value,
                      }}
                      onPress={() => changePickupMethod(method.value)}
                      className={`min-h-24 flex-1 justify-center gap-2 rounded-[16px] border p-4 ${form.method === method.value ? 'border-primary bg-secondary' : 'border-border bg-card'}`}
                    >
                      <Icon
                        name={method.icon}
                        color={
                          form.method === method.value
                            ? palette.primary
                            : palette['muted-foreground']
                        }
                      />
                      <Text
                        className={`text-sm font-medium ${form.method === method.value ? 'text-primary' : 'text-foreground'}`}
                      >
                        {method.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        <Text
          accessibilityRole="header"
          className="mb-4 text-lg font-bold text-foreground"
        >
          {merchantOrder ? 'Where should it arrive?' : 'From here to there'}
        </Text>
        <View className="gap-5">
          {!merchantOrder && (
            <AddressField
              key={form.method}
              label={
                form.method === 'collection'
                  ? 'Collection point'
                  : receiving
                    ? 'Sender’s pickup address'
                    : 'Pickup address'
              }
              placeholder={
                form.method === 'collection'
                  ? 'Enter your preferred collection point'
                  : 'Area, street, building or landmark'
              }
              value={form.pickup}
              point={form.pickupPoint}
              onChangeText={(text) => changeAddress('pickup', text)}
              onSelectPlace={(place) => changeAddress('pickup', place)}
              error={errors.pickup}
              maxLength={200}
              autoComplete="street-address"
              useDeviceLocation={!receiving && form.method === 'pickup'}
              autoFill={!existing}
            />
          )}
          <AddressField
            label={receiving ? 'Your delivery address' : 'Delivery address'}
            placeholder="Area, street, building or landmark"
            value={form.destination}
            point={form.destinationPoint}
            onChangeText={(text) => changeAddress('destination', text)}
            onSelectPlace={(place) => changeAddress('destination', place)}
            error={errors.destination}
            maxLength={200}
            autoComplete="street-address"
            useDeviceLocation={receiving}
            autoFill={!existing}
          />
          {form.pickupPoint && form.destinationPoint ? (
            <RoadRouteCard
              key={tripKey}
              pickup={form.pickupPoint}
              delivery={form.destinationPoint}
              route={form.roadRoute}
              onRoute={(roadRoute) =>
                setForm((current) =>
                  current.pickupPoint &&
                  current.destinationPoint &&
                  routeKey(current.pickupPoint, current.destinationPoint) ===
                    tripKey
                    ? { ...current, roadRoute }
                    : current,
                )
              }
            />
          ) : (
            <Text className="text-xs leading-5 text-muted-foreground">
              Set both stops on the map to see road distance and drive time.
            </Text>
          )}
          <Field
            label="Delivery notes (optional)"
            placeholder="Anything helpful for your delivery"
            value={form.notes}
            onChangeText={(text) => update('notes', text)}
            multiline
            maxLength={500}
            style={{ minHeight: 96, textAlignVertical: 'top' }}
          />
        </View>
        {Object.values(errors).some(Boolean) && (
          <Text
            accessibilityRole="alert"
            className="mt-4 text-sm leading-5 text-destructive"
          >
            Please check the highlighted fields above to continue.
          </Text>
        )}
        {!!saveError && (
          <Text
            accessibilityRole="alert"
            className="mt-4 text-sm leading-5 text-destructive"
          >
            {saveError}
          </Text>
        )}
      </PageScroll>
      <Footer>
        <Button
          label="Review request"
          onPress={() => void review()}
          loading={saving}
          disabled={loading || loadError}
        />
        <Text className="text-center text-xs leading-5 text-muted-foreground">
          You’ll review every detail before confirming.
        </Text>
        {loadError && (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/activity')}
            className="min-h-11 justify-center"
          >
            <Text className="text-center text-sm font-medium text-primary">
              Open Activity to recover saved requests
            </Text>
          </Pressable>
        )}
      </Footer>
    </Page>
  );
}
