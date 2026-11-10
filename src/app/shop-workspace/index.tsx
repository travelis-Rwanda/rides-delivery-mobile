import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { View } from 'react-native';

import { Icon } from '../../components/ui/Icon';
import { ScrollPressable } from '../../components/ui/ScrollInteraction';
import { Text } from '../../components/ui/Text';
import { useShopWorkspace } from '../../features/shop-workspace/ShopWorkspaceProvider';
import { sampleShop } from '../../features/shop-workspace/sample';
import { totalStock } from '../../features/shop-workspace/model';
import { ShopPhoto } from '../../features/shop-workspace/ShopPhoto';
import { ShopPage, ShopRow, ShopTag } from '../../features/shop-workspace/ui';
import { usePalette } from '../../hooks/usePalette';

export default function ShopWorkspaceHome() {
  const { workspace } = useShopWorkspace();
  const palette = usePalette();
  const application = workspace?.application;
  const hasDraft = !!(
    application?.name ||
    application?.category ||
    application?.contact ||
    application?.pickupAddress ||
    application?.photoKey
  );
  const waiting =
    workspace?.orders.filter((order) => order.status === 'pending').length ?? 0;
  const soldOut =
    workspace?.products.filter((product) => totalStock(product) === 0).length ??
    0;
  const metrics = [
    {
      value: waiting,
      label: 'Orders to confirm',
      icon: 'activity',
      href: { pathname: '/shop-workspace/orders', params: { filter: 'new' } },
    },
    {
      value: soldOut,
      label: 'Out of stock',
      icon: 'parcel',
      href: {
        pathname: '/shop-workspace/catalogue',
        params: { filter: 'out-of-stock' },
      },
    },
  ] as const;
  return (
    <ShopPage title="Shop workspace">
      <LinearGradient
        colors={['#102344', '#17468C']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 22, overflow: 'hidden', marginBottom: 12 }}
      >
        <View
          pointerEvents="none"
          className="absolute -right-14 -top-20 h-60 w-60 rounded-full border border-white/20"
        />
        <View
          pointerEvents="none"
          className="absolute -right-7 -top-12 h-48 w-48 rounded-full border border-white/15"
        />
        <View className="gap-2 p-4">
          <View className="flex-row items-center gap-2">
            <Icon name="shop" color="#fff" size={17} />
            <Text className="text-[10px] font-medium tracking-widest text-white/90">
              MERCHANT PREVIEW
            </Text>
          </View>
          <View className="gap-2">
            <Text
              accessibilityRole="header"
              className="text-[28px] font-medium tracking-[-0.8px] text-white"
            >
              {sampleShop.name}
            </Text>
            <Text className="text-sm leading-6 text-white/90">
              Your shop at a glance.
            </Text>
          </View>
        </View>
      </LinearGradient>

      <View className="mb-5">
        <ShopRow
          title={
            application?.submittedAt
              ? 'View shop application'
              : hasDraft
                ? 'Continue shop registration'
                : 'Register a shop'
          }
          description={
            application?.name || 'Set up your business and pickup location.'
          }
          icon="shield"
          leading={
            application?.photoKey ? (
              <ShopPhoto
                photoKey={application.photoKey}
                style={{ width: 52, height: 52, borderRadius: 12 }}
              />
            ) : undefined
          }
          onPress={() => router.push('/shop-workspace/registration')}
        >
          {application?.submittedAt ? (
            <ShopTag label="Awaiting review" tone="warning" />
          ) : (
            hasDraft && <ShopTag label="Draft" />
          )}
        </ShopRow>
      </View>

      <Text
        accessibilityRole="header"
        className="mb-3 text-lg font-medium text-foreground"
      >
        Today’s priorities
      </Text>
      <View className="mb-5 flex-row gap-3">
        {metrics.map(({ value, label, icon, href }) => (
          <ScrollPressable
            key={label}
            accessibilityRole="button"
            onPress={() => router.push(href)}
            className="flex-1 gap-3 rounded-[18px] border border-border bg-card p-3.5"
          >
            <View className="flex-row items-center justify-between">
              <View
                className={`h-8 w-8 items-center justify-center rounded-lg ${value ? 'bg-warning-muted' : 'bg-secondary'}`}
              >
                <Icon
                  name={icon}
                  size={17}
                  color={value ? palette.warning : palette.primary}
                />
              </View>
              <Text className="text-[28px] font-medium text-foreground">
                {value}
              </Text>
            </View>
            <View className="gap-1">
              <Text className="text-xs leading-[18px] text-muted-foreground">
                {label}
              </Text>
            </View>
          </ScrollPressable>
        ))}
      </View>

      <Text
        accessibilityRole="header"
        className="mb-3 text-lg font-medium text-foreground"
      >
        Manage your shop
      </Text>
      <View className="mb-6 overflow-hidden rounded-[18px] border border-border bg-card">
        <ShopRow
          grouped
          title="Orders"
          description="Confirm, prepare, and hand over."
          icon="activity"
          onPress={() => router.push('/shop-workspace/orders')}
        />
        <View className="border-t border-border">
          <ShopRow
            grouped
            title="Catalogue & inventory"
            description="Edit products, photos, and stock."
            icon="shop"
            onPress={() => router.push('/shop-workspace/catalogue')}
          />
        </View>
        <View className="border-t border-border">
          <ShopRow
            grouped
            title="Settlements"
            description="Track earnings and payouts."
            icon="clock"
            onPress={() => router.push('/shop-workspace/settlements')}
          />
        </View>
      </View>

      <Text className="mt-4 text-xs leading-5 text-muted-foreground">
        Preview data and changes are saved on this device.
      </Text>
    </ShopPage>
  );
}
