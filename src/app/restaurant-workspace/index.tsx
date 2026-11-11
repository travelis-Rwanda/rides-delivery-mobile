import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { View } from 'react-native';

import { Icon } from '../../components/ui/Icon';
import { ScrollPressable } from '../../components/ui/ScrollInteraction';
import { Text } from '../../components/ui/Text';
import { useRestaurantWorkspace } from '../../features/restaurant-workspace/RestaurantWorkspaceProvider';
import { sampleRestaurant } from '../../features/restaurant-workspace/sample';
import { RestaurantPhoto } from '../../features/restaurant-workspace/RestaurantPhoto';
import {
  RestaurantPage,
  RestaurantRow,
  RestaurantTag,
} from '../../features/restaurant-workspace/ui';
import { usePalette } from '../../hooks/usePalette';

export default function RestaurantWorkspaceHome() {
  const { workspace } = useRestaurantWorkspace();
  const palette = usePalette();
  const application = workspace?.application;
  const hasDraft = !!(
    application?.name ||
    application?.cuisine ||
    application?.contact ||
    application?.address ||
    application?.photoKey
  );
  const waiting =
    workspace?.orders.filter((o) => o.status === 'pending').length ?? 0;
  const inProgress =
    workspace?.orders.filter(
      (o) => o.status === 'confirmed' || o.status === 'preparing',
    ).length ?? 0;

  const metrics = [
    {
      value: waiting,
      label: 'Orders to confirm',
      icon: 'activity',
      href: { pathname: '/restaurant-workspace/orders', params: { filter: 'new' } },
    },
    {
      value: inProgress,
      label: 'In preparation',
      icon: 'clock',
      href: {
        pathname: '/restaurant-workspace/orders',
        params: { filter: 'in-progress' },
      },
    },
  ] as const;

  return (
    <RestaurantPage title="Restaurant workspace">
      <LinearGradient
        colors={['#1a0a00', '#7c2d00']}
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
            <Icon name="food" color="#fff" size={17} />
            <Text className="text-[10px] font-medium tracking-widest text-white/90">
              MERCHANT PREVIEW
            </Text>
          </View>
          <View className="gap-2">
            <Text
              accessibilityRole="header"
              className="text-[28px] font-medium tracking-[-0.8px] text-white"
            >
              {sampleRestaurant.name}
            </Text>
            <Text className="text-sm leading-6 text-white/90">
              Your restaurant at a glance.
            </Text>
          </View>
        </View>
      </LinearGradient>

      <View className="mb-5">
        <RestaurantRow
          title={
            application?.submittedAt
              ? 'View restaurant application'
              : hasDraft
                ? 'Continue restaurant registration'
                : 'Register a restaurant'
          }
          description={
            application?.name || 'Set up your business and pickup location.'
          }
          icon="shield"
          leading={
            application?.photoKey ? (
              <RestaurantPhoto
                photoKey={application.photoKey}
                label={application.name}
                style={{ width: 52, height: 52, borderRadius: 12 }}
              />
            ) : undefined
          }
          onPress={() => router.push('/restaurant-workspace/registration')}
        >
          {application?.submittedAt ? (
            <RestaurantTag label="Awaiting review" tone="warning" />
          ) : (
            hasDraft && <RestaurantTag label="Draft" />
          )}
        </RestaurantRow>
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
        Manage your restaurant
      </Text>
      <View className="mb-6 overflow-hidden rounded-[18px] border border-border bg-card">
        <RestaurantRow
          grouped
          title="Orders"
          description="Confirm, prepare, and hand over."
          icon="activity"
          onPress={() => router.push('/restaurant-workspace/orders')}
        />
        <View className="border-t border-border">
          <RestaurantRow
            grouped
            title="Menu"
            description="Edit items, photos, and prices."
            icon="food"
            onPress={() => router.push('/restaurant-workspace/menu')}
          />
        </View>
        <View className="border-t border-border">
          <RestaurantRow
            grouped
            title="Settlements"
            description="Track earnings and payouts."
            icon="clock"
            onPress={() => router.push('/restaurant-workspace/settlements')}
          />
        </View>
      </View>

      <Text className="mt-4 text-xs leading-5 text-muted-foreground">
        Preview data and changes are saved on this device.
      </Text>
    </RestaurantPage>
  );
}
