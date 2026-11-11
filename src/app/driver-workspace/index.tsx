import { router } from 'expo-router';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Icon } from '../../components/ui/Icon';
import { ScrollPressable } from '../../components/ui/ScrollInteraction';
import { Text } from '../../components/ui/Text';
import {
  Button,
  EmptyState,
  Header,
  Notice,
  Page,
  PageScroll,
} from '../../components/ui/primitives';
import { useDelivery } from '../../features/delivery/DeliveryProvider';
import { formatMoney } from '../../features/delivery/services';
import { useDriverSession } from '../../features/driver-workspace/DriverSessionProvider';
import { jobsForDriver } from '../../features/driver-workspace/jobs';
import { JobTag } from '../../features/driver-workspace/ui';
import {
  getMockDriver,
  mockDrivers,
} from '../../features/negotiation/mockDrivers';
import { useNegotiation } from '../../features/negotiation/NegotiationProvider';
import { straightLineKm } from '../../features/pricing/minimumFare';
import { usePalette } from '../../hooks/usePalette';

export default function DriverWorkspaceHome() {
  const palette = usePalette();
  const { driverId, loading: sessionLoading, switchTo } = useDriverSession();
  const { requests, loading: requestsLoading } = useDelivery();
  const {
    negotiations,
    loading: negotiationsLoading,
    loadError,
    reload,
  } = useNegotiation();

  const driver = getMockDriver(driverId);
  const loading = sessionLoading || requestsLoading || negotiationsLoading;
  // A job whose request was cancelled has nothing left to show.
  const jobs = jobsForDriver(negotiations, driverId).filter((job) =>
    requests.some((request) => request.id === job.requestId),
  );
  const needsYou = jobs.filter((job) => job.status === 'your-turn').length;

  return (
    <Page>
      <Header title="Driver workspace" />
      <PageScroll>
        <Text className="text-[10px] font-bold tracking-[1.5px] text-primary">
          DRIVER PREVIEW
        </Text>
        <Text
          accessibilityRole="header"
          className="mt-2 text-[26px] font-medium leading-[35px] tracking-[-0.7px] text-foreground"
        >
          Your delivery jobs.
        </Text>
        <Text className="mb-6 mt-3 text-sm leading-6 text-muted-foreground">
          Jobs appear here when a customer’s delivery is matched to you. You
          and the customer trade prices until you agree a fare.
        </Text>

        <Text className="mb-3 text-sm font-medium text-foreground">
          Driving as
        </Text>
        <View className="mb-6 gap-2">
          {mockDrivers.map((entry) => {
            const selected = entry.id === driverId;
            return (
              <Pressable
                key={entry.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => switchTo(entry.id)}
                className={`min-h-14 flex-row items-center justify-between rounded-xl border px-4 py-3 ${selected ? 'border-primary bg-secondary' : 'border-border bg-card'}`}
              >
                <Text
                  className={`text-sm font-medium ${selected ? 'text-primary' : 'text-foreground'}`}
                >
                  {entry.name}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {entry.vehicle}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text
          accessibilityRole="header"
          className="mb-3 text-lg font-medium text-foreground"
        >
          {needsYou > 0
            ? `Jobs (${needsYou} need${needsYou === 1 ? 's' : ''} you)`
            : 'Jobs'}
        </Text>

        {loading ? (
          <ActivityIndicator
            color={palette.primary}
            accessibilityLabel="Loading your jobs"
          />
        ) : loadError ? (
          <EmptyState
            title="Couldn’t load your jobs"
            description="Try loading your saved negotiations again."
          >
            <Button label="Try again" onPress={() => void reload()} />
          </EmptyState>
        ) : jobs.length === 0 ? (
          <Notice>
            No jobs for {driver?.name ?? 'this driver'} yet. As a customer,
            create a parcel or cargo request and find a driver. If it’s matched
            to {driver?.name ?? 'this driver'}, it shows up here.
          </Notice>
        ) : (
          <View className="gap-3">
            {jobs.map((job) => {
              const request = requests.find(
                (entry) => entry.id === job.requestId,
              )!;
              const km =
                request.pickupPoint && driver
                  ? straightLineKm(request.pickupPoint, driver.location)
                  : null;
              return (
                <ScrollPressable
                  key={job.requestId}
                  accessibilityRole="button"
                  accessibilityLabel={`${request.pickup} to ${request.destination}, ${formatMoney(job.lastOffer.amount)}`}
                  onPress={() =>
                    router.push({
                      pathname: '/driver-workspace/jobs/[id]',
                      params: { id: job.requestId },
                    })
                  }
                  className="gap-2 rounded-[20px] bg-card p-4"
                >
                  <View className="flex-row items-center justify-between gap-3">
                    <JobTag status={job.status} />
                    <Text className="text-base font-bold text-primary">
                      {formatMoney(job.lastOffer.amount)}
                    </Text>
                  </View>
                  <Text
                    numberOfLines={1}
                    className="text-sm font-medium text-foreground"
                  >
                    {request.pickup}
                  </Text>
                  <Text
                    numberOfLines={1}
                    className="text-xs text-muted-foreground"
                  >
                    to {request.destination}
                  </Text>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs text-muted-foreground">
                      {request.size}
                      {request.urgent ? ' · Urgent' : ''}
                      {km !== null ? ` · ${km.toFixed(1)} km to pickup` : ''}
                    </Text>
                    <Icon
                      name="chevron"
                      size={17}
                      color={palette['muted-foreground']}
                    />
                  </View>
                </ScrollPressable>
              );
            })}
          </View>
        )}
      </PageScroll>
    </Page>
  );
}