import { Image, View } from 'react-native';

import { Text } from './Text';

export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <Image
      source={require('../../../assets/brand/rides-logo.png')}
      accessibilityLabel="Rides"
      resizeMode="contain"
      style={{ width: size, height: size }}
    />
  );
}

export function Brand() {
  return (
    <View className="flex-row items-center gap-2.5">
      <BrandMark size={44} />
      <View>
        <Text className="text-[23px] font-medium tracking-[-0.7px] text-foreground">
          Rides
        </Text>
        <Text className="mt-0.5 text-[10px] tracking-[1.6px] text-muted-foreground">
          DELIVERY
        </Text>
      </View>
    </View>
  );
}
