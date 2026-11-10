import { Link } from 'expo-router';
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

import { Icon } from '../../../components/ui/Icon';
import { Button } from '../../../components/ui/primitives';
import { Text } from '../../../components/ui/Text';
import { usePalette } from '../../../hooks/usePalette';
import { findRoadRoute } from '../mapsApi';
import {
  coordinateKey,
  formatDistance,
  type Coordinate,
  type RoadRoute,
} from '../places';
import { MapCanvas } from './MapCanvas';
import { deliveryColor, pickupColor } from './mapTypes';

// Key this card by its two endpoints so a changed pin cancels the old lookup.
export function RoadRouteCard({
  pickup,
  delivery,
  route: savedRoute,
  onRoute,
}: {
  pickup: Coordinate;
  delivery: Coordinate;
  route?: RoadRoute;
  onRoute: (route: RoadRoute) => void;
}) {
  const palette = usePalette();
  const route = savedRoute?.geometryDetail === 'full' ? savedRoute : undefined;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  const markers = useMemo(
    () => [
      { point: pickup, title: 'Pickup', color: pickupColor },
      { point: delivery, title: 'Delivery', color: deliveryColor },
    ],
    [pickup, delivery],
  );
  const samePoint = coordinateKey(pickup) === coordinateKey(delivery);

  const startRoute = useEffectEvent(() => {
    if (!route) void calculate();
  });
  useEffect(() => {
    startRoute();
    return () => {
      controller.current?.abort();
      controller.current = null;
    };
  }, []);

  async function calculate() {
    if (controller.current || samePoint) return;
    const request = new AbortController();
    controller.current = request;
    setLoading(true);
    setError('');
    try {
      const result = await findRoadRoute(pickup, delivery, request.signal);
      if (request.signal.aborted) return;
      if (result) onRoute(result);
      else
        setError(
          'No driving route was found. Try moving a pin closer to a road.',
        );
    } catch {
      if (!request.signal.aborted)
        setError('Routing is temporarily unavailable. Try again in a moment.');
    } finally {
      if (controller.current === request) controller.current = null;
      if (!request.signal.aborted) setLoading(false);
    }
  }

  return (
    <View className="gap-3 rounded-[20px] border border-border bg-card p-4">
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-secondary">
          <Icon name="cargo" size={20} color={palette.primary} />
        </View>
        <View className="flex-1">
          <Text
            accessibilityRole="header"
            className="text-sm font-bold text-foreground"
          >
            Driving route
          </Text>
          <Text className="mt-0.5 text-xs leading-5 text-muted-foreground">
            {route
              ? 'Estimated driving time between stops'
              : 'See road distance and estimated drive time.'}
          </Text>
        </View>
      </View>
      <View className="overflow-hidden rounded-[16px] bg-muted">
        <MapCanvas
          height={360}
          label="Driving route from pickup to delivery. Pan and zoom to explore."
          markers={markers}
          path={route?.path}
        />
      </View>
      {route ? (
        <>
          <View className="flex-row flex-wrap gap-2">
            <Text className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-primary">
              {formatDistance(route.distanceMeters)}
            </Text>
            <Text className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-foreground">
              {Math.max(1, Math.round(route.durationSeconds / 60))} min drive
            </Text>
          </View>
          <View className="flex-row flex-wrap items-center justify-between gap-2">
            <Text className="text-[10px] leading-4 text-muted-foreground">
              Blue · Pickup Green · Delivery
            </Text>
            <Link href="https://www.openstreetmap.org/fixthemap" asChild>
              <Text className="text-[10px] leading-4 text-primary">
                © OpenStreetMap · Report a map issue
              </Text>
            </Link>
          </View>
        </>
      ) : samePoint ? (
        <Text className="text-xs leading-5 text-muted-foreground">
          Choose a different location for each stop to see a route.
        </Text>
      ) : (
        <>
          <Button
            label={error ? 'Retry driving route' : 'Finding driving route…'}
            secondary
            loading={loading}
            disabled={loading}
            onPress={() => void calculate()}
          />
          {error ? (
            <Text
              accessibilityRole="alert"
              className="text-xs leading-5 text-destructive"
            >
              {error}
            </Text>
          ) : (
            <Text className="text-[10px] leading-4 text-muted-foreground">
              Pan the map or use the zoom controls to explore your route.
            </Text>
          )}
        </>
      )}
    </View>
  );
}
