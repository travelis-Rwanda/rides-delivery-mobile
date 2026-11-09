import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { Text } from '../../components/ui/Text';

import { Icon } from '../../components/ui/Icon';
import {
  Button,
  EmptyState,
  Footer,
  Header,
  Notice,
  Page,
  PageScroll,
} from '../../components/ui/primitives';
import { BrandMark } from '../../components/ui/Brand';
import { useDelivery } from '../../features/delivery/DeliveryProvider';
import { getService } from '../../features/delivery/services';
import { usePalette } from '../../hooks/usePalette';

export default function ConfirmedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { requests, loading } = useDelivery();
  const palette = usePalette();
  const request = requests.find(
    (entry) => entry.id === id && entry.previewConfirmed,
  );
  if (loading)
    return (
      <Page>
        <Header title="Confirmation" />
        <ActivityIndicator
          accessibilityLabel="Loading confirmation"
          color={palette.primary}
        />
      </Page>
    );
  if (!request)
    return (
      <Page>
        <Header title="Confirmation" />
        <PageScroll>
          <EmptyState
            title="No confirmed preview here"
            description="Review a request first, then confirm its preview."
          >
            <Button
              label="View activity"
              onPress={() => router.replace('/activity')}
            />
          </EmptyState>
        </PageScroll>
      </Page>
    );
  return (
    <Page>
      <Header title="Confirmation" back={false} />
      <PageScroll>
        <View className="items-center py-5">
          <View className="mb-7 mt-4 h-28 w-28 items-center justify-center rounded-[28px] bg-card">
            <BrandMark size={78} />
          </View>
          <View className="mb-5 flex-row items-center gap-1.5 rounded-full bg-success-muted px-3 py-1.5">
            <Icon name="check" size={14} color={palette.success} />
            <Text className="text-xs font-medium text-foreground">
              PREVIEW CONFIRMED
            </Text>
          </View>
          <Text
            accessibilityRole="header"
            className="text-center text-[27px] font-medium leading-9 tracking-[-0.7px] text-foreground"
          >
            Your preview is ready.
          </Text>
          <Text className="mt-3 max-w-xs text-center text-[12px] leading-[21px] text-muted-foreground">
            Your {getService(request.service)?.label.toLowerCase()} preview is
            saved on this device.
          </Text>
        </View>
        <View className="mb-5 gap-4 rounded-[20px] bg-card p-5">
          <Text className="text-xs font-medium tracking-wider text-muted-foreground">
            YOUR DELIVERY PLAN
          </Text>
          <View className="flex-row items-start gap-3">
            <Icon name="parcel" color={palette.primary} size={20} />
            <View className="flex-1">
              <Text className="text-sm font-medium text-foreground">
                {request.pickup}
              </Text>
              <Text className="my-1 text-xs text-muted-foreground">to</Text>
              <Text className="text-sm font-medium text-foreground">
                {request.destination}
              </Text>
            </View>
          </View>
        </View>
        <Notice>
          No request has been sent, no driver has been booked, and you haven’t
          been charged. You can revisit or edit this preview in Activity.
        </Notice>
      </PageScroll>
      <Footer>
        <Button
          label="View activity"
          onPress={() => router.replace('/activity')}
        />
        <Button
          secondary
          label="Back to services"
          onPress={() => router.replace('/')}
          icon={null}
        />
      </Footer>
    </Page>
  );
}
