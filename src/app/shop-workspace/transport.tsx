import { router } from 'expo-router';
import { View } from 'react-native';

import { ShopIntro, ShopPage, ShopRow } from '../../features/shop-workspace/ui';

export default function ShopTransportScreen() {
  return (
    <ShopPage title="Book transport">
      <ShopIntro
        eyebrow="SHOP TRANSPORT"
        title="Send or receive a parcel"
        description="Choose your shop’s role in this delivery."
      />
      <View className="gap-3">
        <ShopRow
          title="Send a parcel"
          description="Arrange pickup from your shop and delivery to someone else."
          icon="cargo"
          onPress={() =>
            router.push({
              pathname: '/delivery/[service]',
              params: { service: 'parcel', direction: 'send', source: 'shop' },
            })
          }
        />
        <ShopRow
          title="Receive a parcel"
          description="Arrange pickup from a sender and delivery to your shop."
          icon="parcel"
          onPress={() =>
            router.push({
              pathname: '/delivery/[service]',
              params: { service: 'parcel', direction: 'receive', source: 'shop' },
            })
          }
        />
      </View>
    </ShopPage>
  );
}
