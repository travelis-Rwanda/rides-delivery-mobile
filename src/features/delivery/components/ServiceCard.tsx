import { router } from 'expo-router';
import { View } from 'react-native';

import { ScrollPressable } from '../../../components/ui/ScrollInteraction';

import { Icon } from '../../../components/ui/Icon';
import { Text } from '../../../components/ui/Text';
import { usePalette } from '../../../hooks/usePalette';
import type { Service } from '../services';

const labels = {
  parcel: { title: 'Parcels', subtitle: 'Send & receive' },
  restaurant: { title: 'Food', subtitle: 'Your favourites' },
  shop: { title: 'Shops', subtitle: 'The essentials' },
  cargo: { title: 'Cargo', subtitle: 'Bigger moves' },
};

export function ServiceCard({ service }: { service: Service }) {
  const p = usePalette();
  const label = labels[service.id];
  const color =
    service.tone === 'green'
      ? p.success
      : service.tone === 'orange'
        ? p.warning
        : p.primary;
  return (
    <ScrollPressable
      accessibilityRole="button"
      accessibilityLabel={`${service.title}. ${service.description}`}
      onPress={() =>
        router.navigate({
          pathname:
            service.id === 'restaurant' || service.id === 'shop'
              ? '/browse/[service]'
              : '/delivery/[service]',
          params: { service: service.id },
        })
      }
      className="min-h-[138px] flex-1 rounded-[20px] bg-card px-3.5 py-4"
    >
      <View
        className={`mb-4 h-11 w-11 items-center justify-center rounded-[14px] ${service.tone === 'green' ? 'bg-success-muted' : service.tone === 'orange' ? 'bg-warning-muted' : 'bg-secondary'}`}
      >
        <Icon name={service.icon} size={25} color={color} />
      </View>
      <Text className="text-[14px] font-medium text-foreground">
        {label.title}
      </Text>
      <Text className="mt-1 text-[10px] leading-[16px] text-muted-foreground">
        {label.subtitle}
      </Text>
    </ScrollPressable>
  );
}
