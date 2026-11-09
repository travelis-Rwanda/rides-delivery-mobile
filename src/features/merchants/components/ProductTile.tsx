import { View } from 'react-native';

import { Icon } from '../../../components/ui/Icon';
import { ScrollPressable } from '../../../components/ui/ScrollInteraction';
import { Text } from '../../../components/ui/Text';
import { usePalette } from '../../../hooks/usePalette';
import { formatMoney, type CatalogItem } from '../../delivery/services';
import { CatalogImage } from './CatalogImage';

export function ProductTile({
  product,
  quantity,
  onChange,
}: {
  product: CatalogItem;
  quantity: number;
  onChange: (quantity: number) => void;
}) {
  const palette = usePalette();
  return (
    <View style={{ width: '48%', marginBottom: 22 }}>
      <View
        className="mb-3 overflow-hidden rounded-[20px] bg-card"
        style={{ aspectRatio: 1.15 }}
      >
        <CatalogImage imageKey={product.imageKey} style={{ flex: 1 }} />
        {quantity === 0 ? (
          <ScrollPressable
            accessibilityRole="button"
            accessibilityLabel={`Add one ${product.name}`}
            onPress={() => onChange(1)}
            className="absolute bottom-2 right-2 h-11 w-11 items-center justify-center rounded-full bg-primary"
          >
            <Icon name="plus" color={palette['primary-foreground']} size={20} />
          </ScrollPressable>
        ) : (
          <View className="absolute bottom-2 left-2 right-2 flex-row items-center justify-between rounded-full bg-card">
            <ScrollPressable
              accessibilityRole="button"
              accessibilityLabel={`Remove one ${product.name}`}
              onPress={() => onChange(quantity - 1)}
              className="h-11 w-11 items-center justify-center rounded-full"
            >
              <Icon name="minus" size={17} color={palette.foreground} />
            </ScrollPressable>
            <Text
              accessibilityLiveRegion="polite"
              accessibilityLabel={`${quantity} ${product.name}`}
              className="text-[12px] font-medium text-foreground"
            >
              {quantity}
            </Text>
            <ScrollPressable
              accessibilityRole="button"
              accessibilityLabel={`Add one ${product.name}`}
              disabled={quantity >= 20}
              accessibilityState={{ disabled: quantity >= 20 }}
              onPress={() => onChange(quantity + 1)}
              className={`h-11 w-11 items-center justify-center rounded-full ${quantity >= 20 ? 'opacity-30' : ''}`}
            >
              <Icon name="plus" size={17} color={palette.primary} />
            </ScrollPressable>
          </View>
        )}
      </View>
      <Text
        numberOfLines={2}
        className="text-[13px] font-medium leading-[19px] text-foreground"
      >
        {product.name}
      </Text>
      <Text
        numberOfLines={2}
        className="mt-1 text-[10px] leading-[16px] text-muted-foreground"
      >
        {product.description}
      </Text>
      <Text className="mt-2 text-[12px] font-medium text-foreground">
        {formatMoney(product.price)}
      </Text>
    </View>
  );
}
