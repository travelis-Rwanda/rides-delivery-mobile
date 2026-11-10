import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { kigali } from '../places';
import { pickupColor, type MapCanvasProps } from './mapTypes';

const tiles =
  process.env.EXPO_PUBLIC_MAP_TILE_URL ??
  'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

export function MapCanvas({
  markers,
  areaCenter,
  path,
  onPick,
  height,
  label,
}: MapCanvasProps) {
  const container = useRef<HTMLDivElement>(null);
  const [mapState, setMapState] = useState<{
    map: LeafletMap;
    leaflet: typeof import('leaflet');
  }>();
  const [failed, setFailed] = useState(false);
  const interactive = true;
  const pick = useEffectEvent(
    (point: { latitude: number; longitude: number }) => onPick?.(point),
  );

  useEffect(() => {
    let map: LeafletMap | undefined;
    let disposed = false;
    void import('leaflet')
      .then((leaflet) => {
        if (disposed || !container.current) return;
        map = leaflet
          .map(container.current, {
            dragging: interactive,
            doubleClickZoom: interactive,
            touchZoom: interactive,
            zoomControl: interactive,
            keyboard: interactive,
            scrollWheelZoom: false,
          })
          .setView([kigali.latitude, kigali.longitude], 12);
        leaflet
          .tileLayer(tiles, {
            maxZoom: 19,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
          })
          .addTo(map);
        if (interactive)
          map.on('click', ({ latlng }) => {
            const point = latlng.wrap();
            pick({ latitude: point.lat, longitude: point.lng });
          });
        setMapState({ map, leaflet });
      })
      .catch(() => {
        if (!disposed) setFailed(true);
      });
    return () => {
      disposed = true;
      map?.remove();
    };
  }, [interactive]);

  useEffect(() => {
    if (!mapState) return;
    const { map, leaflet } = mapState;
    const layers = leaflet.layerGroup().addTo(map);
    if (path)
      leaflet
        .polyline(
          path.map((point) => [point.latitude, point.longitude]),
          {
            color: pickupColor,
            weight: 5,
            smoothFactor: 0,
          },
        )
        .addTo(layers);
    for (const marker of markers)
      leaflet
        .circleMarker([marker.point.latitude, marker.point.longitude], {
          bubblingMouseEvents: false,
          radius: 8,
          fillColor: marker.color,
          fillOpacity: 1,
          color: 'white',
          weight: 3,
        })
        .addTo(layers);

    if (!path && (markers.length === 1 || (!markers.length && areaCenter))) {
      const { latitude, longitude } = markers[0]?.point ?? areaCenter ?? kigali;
      map.setView([latitude, longitude], Math.max(map.getZoom(), 15));
    } else if (markers.length > 1) {
      const points = [...markers.map(({ point }) => point), ...(path ?? [])];
      map.fitBounds(
        points.map((point) => [point.latitude, point.longitude]),
        {
          padding: [26, 26],
          maxZoom: 17,
        },
      );
    }

    return () => {
      layers.remove();
    };
  }, [areaCenter, mapState, markers, path]);

  return (
    <div
      ref={container}
      role={interactive ? 'region' : 'img'}
      aria-label={label}
      style={{
        height,
        width: '100%',
        background: '#E8EEE9',
        isolation: 'isolate',
      }}
    >
      {failed ? 'Map unavailable' : null}
    </div>
  );
}
