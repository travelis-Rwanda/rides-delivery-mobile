import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Text } from '../../components/ui/Text';

import { Icon } from '../../components/ui/Icon';
import {
  Button,
  EmptyState,
  Header,
  Page,
  PageScroll,
} from '../../components/ui/primitives';
import { useDelivery } from '../../features/delivery/DeliveryProvider';
import { getService } from '../../features/delivery/services';
import { usePalette } from '../../hooks/usePalette';

export default function ActivityScreen() {
  const [filter, setFilter] = useState<'Saved' | 'Active' | 'Past'>('Saved');
  const { requests, loading, loadError, reload } = useDelivery();
  const palette = usePalette();
  return (
    <Page>
      <Header title="Activity" back={false} />
      <PageScroll>
        <Text
          accessibilityRole="header"
          className="mt-2 text-[27px] font-medium leading-9 tracking-[-0.7px] text-foreground"
        >
          Your deliveries.
        </Text>
        <Text className="mb-6 mt-3 text-sm leading-6 text-muted-foreground">
          Your saved plans and delivery updates.
        </Text>
        <View className="mb-6 flex-row gap-1 rounded-[16px] bg-muted p-1">
          {(['Saved', 'Active', 'Past'] as const).map((label) => (
            <Pressable
              key={label}
              accessibilityRole="tab"
              accessibilityState={{ selected: filter === label }}
              onPress={() => setFilter(label)}
              className={`min-h-12 flex-1 items-center justify-center rounded-xl px-2 py-3 ${filter === label ? 'bg-card' : ''}`}
            >
              <Text
                className={`text-sm font-medium ${filter === label ? 'text-primary' : 'text-muted-foreground'}`}
              >
                {label}
                {label === 'Saved' && requests.length > 0
                  ? ` (${requests.length})`
                  : ''}
              </Text>
            </Pressable>
          ))}
        </View>
        {loading ? (
          <View className="items-center gap-4 py-16">
            <ActivityIndicator color={palette.primary} />
            <Text className="text-sm text-muted-foreground">
              Loading your requests…
            </Text>
          </View>
        ) : loadError ? (
          <EmptyState
            icon="help"
            title="Let’s try that again"
            description="We couldn’t load your saved requests. Your existing data has not been replaced."
          >
            <Button label="Try again" onPress={() => void reload()} />
          </EmptyState>
        ) : filter === 'Saved' && requests.length > 0 ? (
          <View className="gap-3">
            <Text className="mb-1 text-xs leading-5 text-muted-foreground">
              Previews are saved on this device. They are not live bookings.
            </Text>
            {requests.map((request) => {
              const service = getService(request.service)!;
              return (
                <Pressable
                  key={request.id}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${service.label} to ${request.destination}`}
                  onPress={() =>
                    router.push({
                      pathname: '/request/[id]',
                      params: { id: request.id },
                    })
                  }
                  className="gap-4 rounded-[20px] bg-card p-5 active:opacity-70"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="h-11 w-11 items-center justify-center rounded-xl bg-secondary">
                      <Icon name={service.icon} color={palette.primary} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-foreground">
                        {service.label}
                      </Text>
                      <Text className="mt-1 text-xs text-muted-foreground">
                        {new Date(request.createdAt).toLocaleDateString(
                          undefined,
                          { month: 'short', day: 'numeric' },
                        )}
                      </Text>
                    </View>
                    <View
                      className={`rounded-full px-2.5 py-1 ${request.previewConfirmed ? 'bg-success-muted' : 'bg-muted'}`}
                    >
                      <Text className="text-[10px] font-medium text-foreground">
                        {request.previewConfirmed ? 'PREVIEW READY' : 'DRAFT'}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Icon
                      name="pin"
                      size={16}
                      color={palette['muted-foreground']}
                    />
                    <Text
                      numberOfLines={2}
                      className="flex-1 text-sm leading-5 text-foreground"
                    >
                      {request.destination}
                    </Text>
                    <Icon name="chevron" color={palette.primary} size={17} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <EmptyState
            icon={filter === 'Past' ? 'clock' : 'parcel'}
            title={
              filter === 'Saved'
                ? 'Your next delivery starts here'
                : filter === 'Active'
                  ? 'Nothing on the move yet'
                  : 'A fresh start'
            }
            description={
              filter === 'Saved'
                ? 'Choose a service and prepare your first request. You can revisit the details here.'
                : filter === 'Active'
                  ? 'Live bookings will appear here when delivery services are available. Saved previews stay in the Saved tab.'
                  : 'Your completed deliveries will appear here. For now, explore what Rides can deliver.'
            }
          >
            <Button
              label="Explore services"
              onPress={() => router.replace('/')}
            />
          </EmptyState>
        )}
      </PageScroll>
    </Page>
  );
}
