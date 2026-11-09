import {
  Image,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Icon } from '../../../components/ui/Icon';
import { usePalette } from '../../../hooks/usePalette';

const photos: Record<string, ImageSourcePropType> = {
  burger: require('../../../../assets/catalog/burger.jpg'),
  bowl: require('../../../../assets/catalog/bowl.jpg'),
  chicken: require('../../../../assets/catalog/chicken.jpg'),
  produce: require('../../../../assets/catalog/produce.jpg'),
  pantry: require('../../../../assets/catalog/pantry.jpg'),
  bread: require('../../../../assets/catalog/bread.jpg'),
  coffee: require('../../../../assets/catalog/coffee.jpg'),
  home: require('../../../../assets/catalog/home.jpg'),
  cleaning: require('../../../../assets/catalog/cleaning.jpg'),
};

export function CatalogImage({
  imageKey,
  style,
}: {
  imageKey?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = usePalette();
  const source = imageKey ? photos[imageKey] : undefined;
  return (
    <View
      style={[
        {
          overflow: 'hidden',
          backgroundColor: palette.muted,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      {source ? (
        <Image
          source={source}
          resizeMode="cover"
          style={{ width: '100%', height: '100%' }}
          accessible={false}
        />
      ) : (
        <Icon name="shop" size={26} color={palette['muted-foreground']} />
      )}
    </View>
  );
}
