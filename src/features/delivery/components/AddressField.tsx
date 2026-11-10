import * as Location from 'expo-location';
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ComponentProps,
} from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';

import { Icon } from '../../../components/ui/Icon';
import { Field } from '../../../components/ui/primitives';
import { ScrollPressable } from '../../../components/ui/ScrollInteraction';
import { Text } from '../../../components/ui/Text';
import { usePalette } from '../../../hooks/usePalette';
import { AddressPicker } from '../../maps/components/AddressPicker';
import type { Coordinate, Place } from '../../maps/places';

type AddressProps = ComponentProps<typeof Field> & {
  onChangeText: (value: string) => void;
  onSelectPlace: (place: Place) => void;
  point?: Coordinate;
};

type LookupStatus =
  'idle' | 'locating' | 'found' | 'denied' | 'disabled' | 'unavailable';

const locationMessages = {
  found: 'Check the map pin and add any access instructions in delivery notes.',
  denied: 'Allow location access in Settings or enter the address manually.',
  disabled: 'Turn on Location Services or enter the address manually.',
  unavailable:
    'We couldn’t find an address here. Try again or enter it manually.',
};

function formatAddress(address: Location.LocationGeocodedAddress) {
  const street = [address.streetNumber, address.street]
    .filter(Boolean)
    .join(' ');
  const parts = [
    street || address.name,
    address.district,
    address.city ?? address.region,
  ]
    .map((part) => part?.trim())
    .filter(Boolean);
  return address.formattedAddress?.trim() || [...new Set(parts)].join(', ');
}

export function AddressField({
  useDeviceLocation,
  autoFill,
  point,
  onChangeText,
  onSelectPlace,
  ...field
}: AddressProps & { useDeviceLocation: boolean; autoFill: boolean }) {
  const palette = usePalette();
  const locatable = useDeviceLocation && Platform.OS !== 'web';
  const [pickerOpen, setPickerOpen] = useState(false);
  const [status, setStatus] = useState<LookupStatus>(() =>
    locatable && autoFill && !field.value ? 'locating' : 'idle',
  );
  const activeLookup = useRef<AbortController | null>(null);
  const applyAddress = useEffectEvent(onSelectPlace);

  useEffect(() => {
    if (!locatable || status !== 'locating') return;
    const lookup = new AbortController();
    activeLookup.current = lookup;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    async function locate() {
      try {
        let permission = await Location.getForegroundPermissionsAsync();
        if (lookup.signal.aborted) return;
        if (!permission.granted && permission.canAskAgain)
          permission = await Location.requestForegroundPermissionsAsync();
        if (lookup.signal.aborted) return;
        if (!permission.granted) {
          setStatus('denied');
          return;
        }
        timeout = setTimeout(() => {
          if (lookup.signal.aborted) return;
          lookup.abort();
          setStatus('unavailable');
        }, 15000);

        const enabled = await Location.hasServicesEnabledAsync();
        if (lookup.signal.aborted) return;
        if (!enabled) {
          setStatus('disabled');
          return;
        }
        const { coords } = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          mayShowUserSettingsDialog: false,
        });
        if (lookup.signal.aborted) return;
        const { latitude, longitude } = coords;
        const [result] = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        }).catch(() => []);
        if (lookup.signal.aborted) return;
        const address = result ? formatAddress(result) : '';
        applyAddress({
          latitude,
          longitude,
          label: address || 'Current location',
        });
        setStatus('found');
      } catch {
        if (!lookup.signal.aborted) setStatus('unavailable');
      } finally {
        clearTimeout(timeout);
      }
    }

    void locate();
    return () => {
      lookup.abort();
      clearTimeout(timeout);
      activeLookup.current = null;
    };
  }, [locatable, status]);

  function cancelLookup() {
    activeLookup.current?.abort();
    setStatus('idle');
  }

  const locating = status === 'locating';
  return (
    <View>
      <Field
        {...field}
        onChangeText={(value) => {
          cancelLookup();
          onChangeText(value);
        }}
      />
      <View className="mt-1 flex-row flex-wrap items-center gap-x-4">
        <ScrollPressable
          accessibilityRole="button"
          accessibilityLabel={`Find ${field.label.toLowerCase()} on map`}
          onPress={() => {
            cancelLookup();
            setPickerOpen(true);
          }}
          className="min-h-11 flex-row items-center gap-2"
        >
          <Icon name="search" size={16} color={palette.primary} />
          <Text className="text-xs font-medium text-primary">Find on map</Text>
        </ScrollPressable>
        {locatable && (
          <ScrollPressable
            accessibilityRole="button"
            accessibilityLabel={`Use current location for ${field.label.toLowerCase()}`}
            accessibilityState={{ busy: locating, disabled: locating }}
            disabled={locating}
            onPress={() => setStatus('locating')}
            className="min-h-11 flex-row items-center gap-2"
          >
            {locating ? (
              <ActivityIndicator size="small" color={palette.primary} />
            ) : (
              <Icon name="pin" size={16} color={palette.primary} />
            )}
            <Text className="shrink text-xs font-medium text-primary">
              {locating ? 'Finding your address…' : 'Use current location'}
            </Text>
          </ScrollPressable>
        )}
      </View>
      {point && status === 'idle' && (
        <Text className="text-xs text-muted-foreground">Map pin set</Text>
      )}
      {status !== 'idle' && !locating && (
        <Text
          accessibilityLiveRegion="polite"
          className="text-xs leading-5 text-muted-foreground"
        >
          {locationMessages[status]}
        </Text>
      )}
      {pickerOpen && (
        <AddressPicker
          title={field.label}
          initialQuery={point ? undefined : field.value}
          initial={
            point
              ? { ...point, label: field.value || 'Selected address' }
              : undefined
          }
          onClose={() => setPickerOpen(false)}
          onSelect={(place) => {
            onSelectPlace(place);
            setPickerOpen(false);
          }}
        />
      )}
    </View>
  );
}
