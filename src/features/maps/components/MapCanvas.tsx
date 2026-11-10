import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../../../components/ui/Text';
import MapView, { Marker, Polyline, type Region } from 'react-native-maps';

import { kigali } from '../places';
import { pickupColor, type MapCanvasProps } from './mapTypes';

export function MapCanvas({
  markers,
  areaCenter,
  path,
  onPick,
  height,
  label,
}: MapCanvasProps) {
  const map = useRef<MapView>(null);
  const [ready, setReady] = useState(false);
  const [laidOut, setLaidOut] = useState(false);
  const [fitVersion, setFitVersion] = useState(0);
  const region = useRef<Region | null>(null);
  function zoom(factor: number) {
    if (!region.current) return;
    const next = {
      ...region.current,
      latitudeDelta: Math.min(
        150,
        Math.max(0.0005, region.current.latitudeDelta * factor),
      ),
      longitudeDelta: Math.min(
        150,
        Math.max(0.0005, region.current.longitudeDelta * factor),
      ),
    };
    region.current = next;
    map.current?.animateToRegion(next, 200);
  }

  useEffect(() => {
    if (!ready || !laidOut) return;
    if (!path && (markers.length === 1 || (!markers.length && areaCenter))) {
      map.current?.animateToRegion(
        {
          ...(markers[0]?.point ?? areaCenter ?? kigali),
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        },
        250,
      );
    } else if (markers.length > 1) {
      map.current?.fitToCoordinates(
        [...markers.map(({ point }) => point), ...(path ?? [])],
        {
          edgePadding: { top: 32, left: 32, right: 32, bottom: 32 },
          animated: true,
        },
      );
    }
  }, [areaCenter, laidOut, markers, path, ready, fitVersion]);

  const center = markers[0]?.point ?? areaCenter ?? kigali;
  const delta = markers.length ? 0.02 : 0.13;
  return (
    <View style={{ height }}>
      <MapView
        ref={map}
        style={{ width: '100%', height }}
        accessibilityLabel={label}
        initialRegion={{
          ...center,
          latitudeDelta: delta,
          longitudeDelta: delta,
        }}
        onMapReady={() => setReady(true)}
        onLayout={() => setLaidOut(true)}
        onPress={
          onPick ? (event) => onPick(event.nativeEvent.coordinate) : undefined
        }
        onRegionChangeComplete={(value) => {
          region.current = value;
        }}
        scrollEnabled
        zoomEnabled
        zoomControlEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        moveOnMarkerPress={false}
      >
        {path && (
          <Polyline
            coordinates={[...path]}
            strokeColor={pickupColor}
            strokeWidth={5}
          />
        )}
        {markers.map((marker) => (
          <Marker
            stopPropagation
            key={marker.title}
            coordinate={marker.point}
            title={marker.title}
            pinColor={marker.color}
          />
        ))}
      </MapView>
      <View className="absolute right-3 top-3 gap-2">
        {[
          { label: 'Zoom in', text: '+', factor: 0.5 },
          { label: 'Zoom out', text: '−', factor: 2 },
          {
            label: 'Fit map to stops',
            text: '↗',
            factor: 0,
          },
        ].map((control) => (
          <Pressable
            key={control.label}
            accessibilityRole="button"
            accessibilityLabel={control.label}
            onPress={() =>
              control.factor
                ? zoom(control.factor)
                : setFitVersion((value) => value + 1)
            }
            disabled={!ready}
            className="h-11 w-11 items-center justify-center rounded-xl border border-border bg-card"
          >
            <Text className="text-xl text-foreground">{control.text}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
