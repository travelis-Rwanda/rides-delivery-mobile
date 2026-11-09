import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { View } from 'react-native';

import { Icon } from '../../../components/ui/Icon';
import { ScrollPressable } from '../../../components/ui/ScrollInteraction';
import { Text } from '../../../components/ui/Text';
import { usePalette } from '../../../hooks/usePalette';
import type { Merchant } from '../catalog';
import { CatalogImage } from './CatalogImage';

export function MerchantCard({
  merchant,
  featured = false,
}: {
  merchant: Merchant;
  featured?: boolean;
}) {
  const palette = usePalette();
  const open = () =>
    router.navigate({
      pathname: '/merchant/[id]',
      params: { id: merchant.id },
    });
  return featured ? (
    <ScrollPressable
      accessibilityRole="button"
      accessibilityLabel={`Browse ${merchant.name}, ${merchant.category}`}
      onPress={open}
      className="mb-2 overflow-hidden rounded-[24px] bg-card"
    >
      <View style={{ height: 230 }}>
        <CatalogImage
          imageKey={merchant.cover}
          style={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0 }}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.80)']}
          style={{ flex: 1, justifyContent: 'flex-end', padding: 20 }}
        >
          <View className="mb-3 self-start rounded-full bg-white/95 px-3 py-1.5">
            <Text className="text-[10px] font-medium text-[#171717]">
              {merchant.category}
            </Text>
          </View>
          <View className="flex-row items-end justify-between gap-3">
            <View className="flex-1">
              <Text className="text-[24px] font-medium leading-8 text-white">
                {merchant.name}
              </Text>
              <Text className="mt-1 text-[11px] leading-[18px] text-white/85">
                {merchant.tagline}
              </Text>
            </View>
            <View className="h-11 w-11 items-center justify-center rounded-full bg-white">
              <Icon name="arrow" color="#141414" size={20} />
            </View>
          </View>
        </LinearGradient>
      </View>
    </ScrollPressable>
  ) : (
    <ScrollPressable
      accessibilityRole="button"
      accessibilityLabel={`Browse ${merchant.name}, ${merchant.category}`}
      onPress={open}
      className="flex-row items-center gap-4 border-b border-border py-4"
    >
      <CatalogImage
        imageKey={merchant.cover}
        style={{ width: 88, height: 94, borderRadius: 18 }}
      />
      <View className="flex-1 gap-1.5">
        <Text className="text-[15px] font-medium leading-[22px] text-foreground">
          {merchant.name}
        </Text>
        <Text className="text-[11px] leading-[18px] text-muted-foreground">
          {merchant.tagline}
        </Text>
        <Text className="text-[10px] text-primary">
          {merchant.category} · {merchant.products.length} items
        </Text>
      </View>
      <Icon name="chevron" size={17} color={palette['muted-foreground']} />
    </ScrollPressable>
  );
}
