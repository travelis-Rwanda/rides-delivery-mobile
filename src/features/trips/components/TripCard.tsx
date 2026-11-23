import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Icon } from '../../../components/ui/Icon';
import { Text } from '../../../components/ui/Text';
import { usePalette } from '../../../hooks/usePalette';
import type { DeliveryRequest } from '../../delivery/model';
import { formatMoney, getService } from '../../delivery/services';
import { tripStatusLabels, type Trip } from '../trip';
import { starsText } from '../view';

// One delivery in the customer's Active or Past list. Tapping it opens the
// tracking screen.
export function TripCard({
  trip,
  request,
}: {
  trip: Trip;
  request?: DeliveryRequest;
}) {
  const palette = usePalette();
  const service = request ? getService(request.service) : undefined;
  const label = request
    ? request.parcelDirection === 'receive'
      ? 'Incoming parcel'
      : request.parcelDirection === 'send'
        ? 'Outgoing parcel'
        : (service?.label ?? 'Delivery')
    : 'Delivery';
  const completed = trip.status === 'completed';
  const when = trip.history[trip.history.length - 1].at;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${tripStatusLabels[trip.status]}${request ? ` to ${request.destination}` : ''}`}
      onPress={() =>
        router.push({ pathname: '/track/[id]', params: { id: trip.requestId } })
      }
      className="gap-4 rounded-[20px] bg-card p-5 active:opacity-70"
    >
      <View className="flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-secondary">
          <Icon name={service?.icon ?? 'parcel'} color={palette.primary} />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-bold text-foreground">{label}</Text>
          <Text className="mt-1 text-xs text-muted-foreground">
            {new Date(when).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
            {' · '}
            {formatMoney(trip.total)}
          </Text>
        </View>
        <View
          className={`rounded-full px-2.5 py-1 ${completed ? 'bg-muted' : 'bg-success-muted'}`}
        >
          <Text className="text-[10px] font-medium text-foreground">
            {tripStatusLabels[trip.status].toUpperCase()}
          </Text>
        </View>
      </View>
      {request && (
        <View className="flex-row items-center gap-2">
          <Icon name="pin" size={16} color={palette['muted-foreground']} />
          <Text
            numberOfLines={2}
            className="flex-1 text-sm leading-5 text-foreground"
          >
            {request.destination}
          </Text>
          <Icon name="chevron" color={palette.primary} size={17} />
        </View>
      )}
      {completed && trip.rating && (
        <Text className="text-sm text-primary">
          {starsText(trip.rating.stars)}
        </Text>
      )}
    </Pressable>
  );
}