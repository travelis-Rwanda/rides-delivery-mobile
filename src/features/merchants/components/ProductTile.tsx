import { View } from 'react-native';

import { Icon } from '../../../components/ui/Icon';
import { ScrollPressable } from '../../../components/ui/ScrollInteraction';
import { Text } from '../../../components/ui/Text';
import { usePalette } from '../../../hooks/usePalette';
import {
  formatMoney,
  stockLimit,
  type CatalogItem,
} from '../../delivery/services';
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
  const nextQuantity = quantity + 1;
  const available = stockLimit(product);
  const canAdd =
    Number.isSafeInteger(nextQuantity) && nextQuantity <= available;
  return (
    <View style={{ width: '48%', marginBottom: 22 }}>
      <View
        className="mb-3 overflow-hidden rounded-[20px] bg-card"
        style={{ aspectRatio: 1.15 }}
      >
        <CatalogImage
          imageKey={product.imageKey}
          previewLabel={product.name}
          style={{ flex: 1 }}
        />
        {available === 0 ? (
          <>
            <View
              pointerEvents="none"
              className="absolute left-2 top-2 rounded-full bg-card px-2.5 py-1.5"
            >
              <Text className="text-[10px] font-bold text-destructive">
                Out of stock
              </Text>
            </View>
            {quantity > 0 && (
              <ScrollPressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${product.name} from basket`}
                onPress={() => onChange(0)}
                className="absolute bottom-2 right-2 min-h-11 justify-center rounded-full bg-card px-3"
              >
                <Text className="text-xs font-medium text-destructive">
                  Remove
                </Text>
              </ScrollPressable>
            )}
          </>
        ) : quantity === 0 ? (
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
              disabled={!canAdd}
              accessibilityState={{ disabled: !canAdd }}
              onPress={() => onChange(nextQuantity)}
              className={`h-11 w-11 items-center justify-center rounded-full ${canAdd ? '' : 'opacity-30'}`}
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
      {available > 0 && quantity >= available && (
        <Text
          accessibilityLiveRegion="polite"
          className={`mt-1 text-[10px] ${quantity > available ? 'text-destructive' : 'text-muted-foreground'}`}
        >
          {quantity > available
            ? 'Reduce quantity to continue'
            : 'Stock limit reached'}
        </Text>
      )}
    </View>
  );
}
