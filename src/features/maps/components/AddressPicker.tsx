import * as Location from 'expo-location';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Modal, Platform, Pressable, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Icon } from '../../../components/ui/Icon';
import {
  Button,
  Field,
  Footer,
  Header,
  Page,
  PageScroll,
} from '../../../components/ui/primitives';
import { Text } from '../../../components/ui/Text';
import { usePalette } from '../../../hooks/usePalette';
import { findAddresses, findNearbyPlaces, resolveAddress } from '../mapsApi';
import { coordinateKey, kigali, type Coordinate, type Place } from '../places';
import { MapCanvas } from './MapCanvas';
import { pickupColor } from './mapTypes';

export function AddressPicker({
  title,
  initial,
  initialQuery,
  onSelect,
  onClose,
}: {
  title: string;
  initial?: Place;
  initialQuery?: string;
  onSelect: (place: Place) => void;
  onClose: () => void;
}) {
  const palette = usePalette();
  const [query, setQuery] = useState(initialQuery ?? '');
  const [selected, setSelected] = useState(initial);
  const [pinName, setPinName] = useState<string | null>(null);
  const [deviceCenter, setDeviceCenter] = useState<Coordinate>();
  const [locationChecked, setLocationChecked] = useState(Platform.OS === 'web');
  const [lookup, setLookup] = useState<{ key: string; places?: Place[] }>();
  const [resolving, setResolving] = useState(false);
  const activePin = useRef<AbortController | null>(null);
  const term = query.trim();
  const showNearby = !term && !selected;
  const center = selected ?? deviceCenter ?? kigali;
  const { latitude, longitude } = center;
  const lookupKey =
    term.length >= 3 || showNearby ? `${coordinateKey(center)}:${term}` : null;
  const currentLookup =
    lookupKey && lookup?.key === lookupKey ? lookup : undefined;
  const suggestions = currentLookup?.places ?? [];
  const loading = !!lookupKey && !currentLookup;
  const markers = useMemo(
    () =>
      selected
        ? [{ point: selected, title: selected.label, color: pickupColor }]
        : [],
    [selected],
  );
  useEffect(() => () => activePin.current?.abort(), []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let cancelled = false;
    async function checkLocation() {
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (!permission.granted || cancelled) return;
        const position = await Location.getLastKnownPositionAsync({
          maxAge: 5 * 60 * 1000,
          requiredAccuracy: 1000,
        });
        if (!cancelled && position) {
          const { latitude, longitude } = position.coords;
          setDeviceCenter({ latitude, longitude });
        }
      } catch {
        // Fall back to the default map area when location is unavailable.
      } finally {
        if (!cancelled) setLocationChecked(true);
      }
    }
    void checkLocation();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!lookupKey || (!locationChecked && !selected)) return;
    const controller = new AbortController();
    const { signal } = controller;
    const point = { latitude, longitude };
    async function loadPlaces(key: string) {
      try {
        const places = showNearby
          ? await findNearbyPlaces(point, signal)
          : await findAddresses(term, point, signal);
        if (!signal.aborted) setLookup({ key, places });
      } catch {
        if (!signal.aborted) setLookup({ key });
      }
    }
    const timer = setTimeout(
      () => void loadPlaces(lookupKey),
      showNearby ? 0 : 500,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    latitude,
    longitude,
    locationChecked,
    lookupKey,
    selected,
    showNearby,
    term,
  ]);

  async function pickPoint(point: Coordinate) {
    Keyboard.dismiss();
    activePin.current?.abort();
    setQuery('');
    const controller = new AbortController();
    activePin.current = controller;
    setSelected({ ...point, label: 'Pinned location' });
    setPinName('');
    setResolving(true);
    try {
      const address = await resolveAddress(point, controller.signal);
      if (!controller.signal.aborted && address) setSelected(address);
    } catch {
      // The exact pin remains usable when an address is unavailable.
    } finally {
      if (!controller.signal.aborted) setResolving(false);
    }
  }

  const content = (
    <Page avoidKeyboard>
      <Header
        title={title}
        back={false}
        action={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close address picker"
            onPress={onClose}
            className="h-11 w-11 items-center justify-center rounded-[14px] bg-card"
          >
            <Icon name="close" color={palette.foreground} size={20} />
          </Pressable>
        }
      />
      <PageScroll>
        <View className="mb-4 gap-2">
          <Field
            label="Search addresses"
            placeholder="Street, neighbourhood or landmark"
            value={query}
            onChangeText={setQuery}
            returnKeyType="done"
            autoCorrect={false}
            maxLength={160}
          />
          <Text className="text-[10px] leading-4 text-muted-foreground">
            Search text and the lookup area are sent to the address provider.
          </Text>
        </View>

        {(term || showNearby) && (
          <View className="mb-4 overflow-hidden rounded-[18px] border border-border bg-card">
            <Text className="px-4 pb-2 pt-3 text-[10px] font-medium tracking-wider text-muted-foreground">
              {showNearby
                ? deviceCenter
                  ? 'NEARBY PLACES'
                  : 'PLACES NEAR CENTRAL KIGALI'
                : 'ADDRESS RESULTS'}
            </Text>
            {suggestions.map((place) => (
              <Pressable
                key={`${place.latitude},${place.longitude},${place.label}`}
                accessibilityRole="button"
                accessibilityState={{ selected: selected === place }}
                onPress={() => {
                  Keyboard.dismiss();
                  activePin.current?.abort();
                  setResolving(false);
                  setQuery('');
                  setSelected(place);
                  setPinName(null);
                }}
                className="min-h-14 flex-row items-center gap-3 border-t border-border px-4 py-2.5 active:opacity-60"
              >
                <Icon name="pin" size={17} color={palette.primary} />
                <View className="flex-1">
                  <Text className="text-sm font-medium text-foreground">
                    {place.label}
                  </Text>
                  {!!place.detail && (
                    <Text className="mt-0.5 text-xs text-muted-foreground">
                      {place.detail}
                    </Text>
                  )}
                </View>
                {selected === place && (
                  <Icon name="check" size={17} color={palette.primary} />
                )}
              </Pressable>
            ))}
            {!suggestions.length && (
              <Text
                accessibilityLiveRegion="polite"
                className="px-4 pb-3 text-xs leading-5 text-muted-foreground"
              >
                {loading
                  ? showNearby
                    ? 'Finding nearby places…'
                    : 'Searching addresses…'
                  : !lookupKey
                    ? 'Enter at least 3 characters to search.'
                    : !currentLookup?.places
                      ? 'Address lookup is unavailable. Try another search or use the map.'
                      : showNearby
                        ? 'No mapped places nearby. Search for an address or drop a pin.'
                        : 'No matching addresses. Try a street name or landmark.'}
              </Text>
            )}
          </View>
        )}
        <View className="overflow-hidden rounded-[20px] border border-border bg-muted">
          <MapCanvas
            height={360}
            label="Address map. Tap a location to place a pin."
            markers={markers}
            areaCenter={deviceCenter}
            onPick={(point) => void pickPoint(point)}
          />
        </View>
        <Text className="mb-3 mt-2 text-xs leading-5 text-muted-foreground">
          {selected?.label === 'Pinned location' && !resolving
            ? 'No street name was found here. Add a nearby landmark to help your driver; your exact pin is saved.'
            : 'Pan or zoom, then tap to choose the exact spot. We’ll find its street address.'}
        </Text>
        {pinName !== null && (
          <Field
            label={
              selected?.label === 'Pinned location'
                ? 'Building or landmark (required)'
                : 'Building, apartment or landmark (optional)'
            }
            placeholder="Add a detail to help your driver"
            value={pinName}
            onChangeText={setPinName}
            maxLength={160}
          />
        )}
      </PageScroll>
      <Footer>
        <Text
          className="text-xs font-medium leading-5 text-foreground"
          numberOfLines={2}
        >
          {resolving
            ? 'Finding the street address…'
            : selected
              ? [selected.label, selected.detail, pinName?.trim()]
                  .filter(Boolean)
                  .join(' · ')
              : 'Select a search result or drop a pin.'}
        </Text>
        <Button
          label="Use this address"
          icon="check"
          disabled={
            !selected ||
            resolving ||
            (selected.label === 'Pinned location' && !pinName?.trim())
          }
          onPress={() => {
            if (
              !selected ||
              (selected.label === 'Pinned location' && !pinName?.trim())
            )
              return;
            const customLabel = pinName?.trim();
            onSelect(
              customLabel
                ? {
                    ...selected,
                    label:
                      selected.label === 'Pinned location'
                        ? customLabel
                        : selected.label,
                    detail: [
                      selected.detail,
                      selected.label === 'Pinned location'
                        ? undefined
                        : customLabel,
                    ]
                      .filter(Boolean)
                      .join(', '),
                  }
                : selected,
            );
          }}
        />
      </Footer>
    </Page>
  );

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      {/* Measuring a new web provider during the slide reads the translated frame. */}
      {Platform.OS === 'web' ? (
        content
      ) : (
        <SafeAreaProvider>{content}</SafeAreaProvider>
      )}
    </Modal>
  );
}
