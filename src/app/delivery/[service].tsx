import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
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
import {
  validateRequest,
  type DeliveryRequest,
} from '../../features/delivery/model';
import {
  formatMoney,
  getService,
  previewCatalog,
  type Service,
} from '../../features/delivery/services';
import { usePalette } from '../../hooks/usePalette';

export default function ServiceRoute() {
  const { service: serviceId, id } = useLocalSearchParams<{
    service: string;
    id?: string;
  }>();
  const service = getService(serviceId);
  const { requests } = useDelivery();
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
  return (
    <ServiceForm
      key={`${service.id}-${existing?.id ?? 'new'}`}
      service={service}
      existing={existing}
    />
  );
}

function ServiceForm({
  service,
  existing,
}: {
  service: Service;
  existing?: DeliveryRequest;
}) {
  const palette = usePalette();
  const { save, loading, loadError } = useDelivery();
  const merchantOrder = service.id === 'restaurant' || service.id === 'shop';
  const catalog =
    service.id === 'restaurant' || service.id === 'shop'
      ? previewCatalog[service.id]
      : [];
  const [form, setForm] = useState<DeliveryRequest>(
    () =>
      existing ?? {
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
        service: service.id,
        pickup: merchantOrder
          ? service.id === 'restaurant'
            ? 'Sample restaurant'
            : 'Sample shop'
          : '',
        destination: '',
        description: '',
        method: 'pickup',
        size: 'Small',
        notes: '',
        quantities: {},
        createdAt: new Date().toISOString(),
        previewConfirmed: false,
      },
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

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
      <Header title={service.label} />
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
              {merchantOrder
                ? service.id === 'restaurant'
                  ? 'Something delicious?'
                  : 'The everyday essentials.'
                : 'Let’s plan your delivery.'}
            </Text>
            <Text className="mt-2 text-[12px] leading-5 text-muted-foreground">
              {service.description}
            </Text>
          </View>
        </View>
        <View className="mb-6">
          <Notice>
            Try the complete flow with a preview request. No driver is booked
            and no payment is taken.
          </Notice>
        </View>

        {merchantOrder ? (
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
                    <View
                      className={`h-12 w-12 items-center justify-center rounded-xl ${service.id === 'restaurant' ? 'bg-warning-muted' : 'bg-success-muted'}`}
                    >
                      <Icon
                        name={item.icon}
                        color={
                          service.id === 'restaurant'
                            ? palette.warning
                            : palette.success
                        }
                        size={24}
                      />
                    </View>
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
                label="What are you sending?"
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
                  How should it start?
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
                      onPress={() => {
                        update('method', method.value);
                        update('pickup', '');
                      }}
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
            <Field
              label={
                form.method === 'collection'
                  ? 'Collection point'
                  : 'Pickup address'
              }
              placeholder={
                form.method === 'collection'
                  ? 'Enter your preferred collection point'
                  : 'Area, street, building or landmark'
              }
              value={form.pickup}
              onChangeText={(text) => update('pickup', text)}
              error={errors.pickup}
              maxLength={200}
              autoComplete="street-address"
            />
          )}
          <Field
            label="Delivery address"
            placeholder="Area, street, building or landmark"
            value={form.destination}
            onChangeText={(text) => update('destination', text)}
            error={errors.destination}
            maxLength={200}
            autoComplete="street-address"
          />
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
