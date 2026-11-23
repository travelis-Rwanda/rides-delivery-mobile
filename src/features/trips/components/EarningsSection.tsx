import { View } from 'react-native';

import { Text } from '../../../components/ui/Text';
import { useNow } from '../../../hooks/useNow';
import type { DeliveryRequest } from '../../delivery/model';
import { formatMoney } from '../../delivery/services';
import { driverEarnings, earningsHistory } from '../earnings';
import type { Trip } from '../trip';
import { starsText } from '../view';

const HISTORY_LIMIT = 10;

// The driver's money at a glance: today, this week and all time, how many
// deliveries and how they are rated, then each completed delivery below.
export function EarningsSection({
  trips,
  driverId,
  requests,
}: {
  trips: Record<string, Trip>;
  driverId: string;
  requests: DeliveryRequest[];
}) {
  // Refreshed every minute so "today" rolls over at midnight.
  const now = useNow(true, 60_000);
  const summary = driverEarnings(trips, driverId, now);
  const history = earningsHistory(trips, driverId).slice(0, HISTORY_LIMIT);

  return (
    <View className="mb-6 gap-3">
      <Text
        accessibilityRole="header"
        className="text-lg font-medium text-foreground"
      >
        Earnings
      </Text>
      <View className="gap-4 rounded-[20px] bg-card p-5">
        <View className="flex-row gap-3">
          {[
            { label: 'TODAY', value: summary.today },
            { label: 'THIS WEEK', value: summary.thisWeek },
            { label: 'ALL TIME', value: summary.allTime },
          ].map((item) => (
            <View key={item.label} className="flex-1 gap-1">
              <Text className="text-[10px] font-medium tracking-wider text-muted-foreground">
                {item.label}
              </Text>
              <Text className="text-base font-medium text-foreground">
                {formatMoney(item.value)}
              </Text>
            </View>
          ))}
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1 gap-1">
            <Text className="text-[10px] font-medium tracking-wider text-muted-foreground">
              DELIVERIES
            </Text>
            <Text className="text-base font-medium text-foreground">
              {summary.deliveries}
            </Text>
          </View>
          <View className="flex-[2] gap-1">
            <Text className="text-[10px] font-medium tracking-wider text-muted-foreground">
              RATING
            </Text>
            <Text className="text-base font-medium text-foreground">
              {summary.averageRating !== undefined
                ? `${starsText(Math.round(summary.averageRating))} ${summary.averageRating.toFixed(1)} (${summary.ratingCount})`
                : 'No ratings yet'}
            </Text>
          </View>
        </View>
        <Text className="text-xs leading-5 text-muted-foreground">
          Earnings are your share of each fare plus tips. The service fee and
          tax are not part of them.
        </Text>
      </View>

      {history.length > 0 && (
        <View className="gap-3 rounded-[20px] bg-card p-5">
          <Text className="text-xs font-medium tracking-wider text-muted-foreground">
            RECENT DELIVERIES
          </Text>
          {history.map((row) => {
            const request = requests.find((entry) => entry.id === row.requestId);
            return (
              <View
                key={row.requestId}
                className="flex-row items-start justify-between gap-3"
              >
                <View className="flex-1">
                  <Text numberOfLines={1} className="text-sm text-foreground">
                    {request?.destination ?? 'Delivery'}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {new Date(row.completedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                    {' · '}
                    Fare {formatMoney(row.fare)}
                    {row.tip > 0 ? ` + tip ${formatMoney(row.tip)}` : ''}
                  </Text>
                </View>
                <Text className="text-sm font-medium text-foreground">
                  {formatMoney(row.total)}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}