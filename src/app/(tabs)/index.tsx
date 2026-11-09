import { router } from 'expo-router';
import { View } from 'react-native';

import { ScrollPressable } from '../../components/ui/ScrollInteraction';

import { Brand } from '../../components/ui/Brand';
import { Icon } from '../../components/ui/Icon';
import { Page, PageScroll } from '../../components/ui/primitives';
import { Text } from '../../components/ui/Text';
import { ParcelHero } from '../../features/delivery/components/ParcelHero';
import { ServiceCard } from '../../features/delivery/components/ServiceCard';
import { useDelivery } from '../../features/delivery/DeliveryProvider';
import { getService, services } from '../../features/delivery/services';
import { usePalette } from '../../hooks/usePalette';

export default function DiscoverScreen() {
  const p = usePalette();
  const { requests } = useDelivery();
  const latest = requests[0];
  return (
    <Page>
      <PageScroll>
        <View className="flex-row items-center justify-between pb-7 pt-4">
          <Brand />
          <ScrollPressable
            accessibilityRole="button"
            accessibilityLabel="Delivery help"
            onPress={() => router.navigate('/help')}
            className="h-11 w-11 items-center justify-center rounded-full bg-card"
          >
            <Icon name="help" size={21} color={p.foreground} />
          </ScrollPressable>
        </View>

        <View className="mb-6">
          <Text
            accessibilityRole="header"
            className="text-[30px] font-medium leading-[39px] tracking-[-1px] text-foreground"
          >
            Your everyday,{`\n`}delivered<Text className="text-primary">.</Text>
          </Text>
          <Text className="mt-2 text-[12px] leading-5 text-muted-foreground">
            A little less to do. A little more time for you.
          </Text>
        </View>

        <ParcelHero />

        <View className="mb-3.5 mt-7 flex-row items-center justify-between">
          <Text
            accessibilityRole="header"
            className="text-[16px] font-medium tracking-[-0.3px] text-foreground"
          >
            What else do you need?
          </Text>
        </View>
        <View className="flex-row gap-2.5">
          {services
            .filter((service) => service.id !== 'parcel')
            .map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
        </View>

        <ScrollPressable
          accessibilityRole="button"
          accessibilityLabel={
            latest ? 'Open your saved request' : 'View your delivery activity'
          }
          onPress={() =>
            latest
              ? router.navigate({
                  pathname: '/request/[id]',
                  params: { id: latest.id },
                })
              : router.navigate('/activity')
          }
          className="mt-6 flex-row items-center gap-3.5 border-b border-border pb-5 pt-1"
        >
          <View className="h-11 w-11 items-center justify-center rounded-[14px] bg-secondary">
            <Icon name="activity" color={p.primary} size={21} />
          </View>
          <View className="flex-1">
            <Text className="text-[13px] font-medium text-foreground">
              {latest ? 'Continue your request' : 'Your deliveries'}
            </Text>
            <Text className="mt-1 text-[11px] leading-[18px] text-muted-foreground">
              {latest
                ? `${getService(latest.service)?.label} · Saved preview`
                : 'Every request. Every update. In one place.'}
            </Text>
          </View>
          <Icon name="chevron" size={17} color={p['muted-foreground']} />
        </ScrollPressable>
        <ScrollPressable
          accessibilityRole="button"
          accessibilityLabel="Learn how Rides delivery works"
          onPress={() => router.navigate('/help')}
          className="mt-1 min-h-14 flex-row items-center justify-center gap-2"
        >
          <Icon name="shield" size={15} color={p['muted-foreground']} />
          <Text className="text-[10px] text-muted-foreground">
            Your delivery. The Rides network behind it.
          </Text>
        </ScrollPressable>
      </PageScroll>
    </Page>
  );
}
