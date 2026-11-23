import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import { Image, Linking, Platform, View } from 'react-native';

import { Text } from '../../../components/ui/Text';
import { Button, Notice } from '../../../components/ui/primitives';
import type { DeliveryRequest } from '../../delivery/model';
import { formatMoney } from '../../delivery/services';
import { makePhotoKey } from '../../restaurant-workspace/photoAsset';
import { directionsUrl } from '../directions';
import { deleteProofPhoto, saveProofPhoto } from '../proofPhoto';
import { useTrips } from '../TripProvider';
import {
  deliver,
  pickUp,
  startDriving,
  type Trip,
  type TripResult,
} from '../trip';
import { driverStep, starsText } from '../view';
import { ProofPhoto } from './ProofPhoto';

// The driver's side of a paid delivery: directions, each step in order, and a
// photo of the handover as proof before the delivery counts as delivered.
export function DriverTripSection({
  trip,
  request,
}: {
  trip: Trip;
  request: DeliveryRequest;
}) {
  const { act } = useTrips();
  const step = driverStep(trip);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset>();
  const working = useRef(false);

  const run = async (change: (t: Trip, now: string) => TripResult) => {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setError('');
    const result = await act(trip.requestId, change);
    if (!result.ok) setError(result.error);
    working.current = false;
    setBusy(false);
  };

  const openDirections = () => {
    if (!step.stop) return;
    setError('');
    Linking.openURL(directionsUrl(request, step.stop)).catch(() =>
      setError('Could not open maps. Use the address shown above instead.'),
    );
  };

  async function takePhoto() {
    if (working.current) return;
    setError('');
    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setError('Allow camera access to take the proof photo.');
          return;
        }
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      });
      if (result.canceled) return;
      const taken = result.assets[0];
      // Checks the type and size now, so a bad photo is caught before saving.
      makePhotoKey(taken, taken.file?.size ?? taken.fileSize ?? 1);
      setAsset(taken);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to take a photo.',
      );
    }
  }

  async function confirmDelivered() {
    if (!asset || working.current) return;
    working.current = true;
    setBusy(true);
    setError('');
    let key: string | undefined;
    try {
      key = await saveProofPhoto(asset);
      const saved = key;
      const result = await act(trip.requestId, (t, now) =>
        deliver(t, saved, now),
      );
      if (!result.ok) {
        void deleteProofPhoto(saved).catch(() => {});
        setError(result.error);
      } else {
        setAsset(undefined);
      }
    } catch (cause) {
      if (key) void deleteProofPhoto(key).catch(() => {});
      setError(
        cause instanceof Error ? cause.message : 'The photo could not be saved.',
      );
    } finally {
      working.current = false;
      setBusy(false);
    }
  }

  const tip = trip.tip ?? 0;

  return (
    <View className="mb-4 gap-3">
      <View className="gap-2 rounded-[20px] bg-card p-5">
        <Text className="text-xs font-medium tracking-wider text-muted-foreground">
          {step.title.toUpperCase()}
        </Text>
        <Text className="text-sm leading-6 text-foreground">{step.detail}</Text>
        {trip.status === 'completed' && (
          <Text className="text-sm font-medium text-foreground">
            You earned {formatMoney(trip.driverFare + tip)}
            {tip > 0 ? ` including a ${formatMoney(tip)} tip` : ''}.
          </Text>
        )}
        {trip.rating && (
          <Text className="text-sm text-foreground">
            Customer rating: {starsText(trip.rating.stars)}
            {trip.rating.review ? ` · “${trip.rating.review}”` : ''}
          </Text>
        )}
        {trip.pickupConfirmedAt && trip.status === 'in-transit' && (
          <Text className="text-xs text-muted-foreground">
            The customer confirmed the pickup.
          </Text>
        )}
      </View>

      {step.stop && (
        <Button
          secondary
          icon="pin"
          label={`Open directions to ${step.stop === 'pickup' ? 'pickup' : 'destination'}`}
          disabled={busy}
          onPress={openDirections}
        />
      )}

      {trip.status === 'booked' && (
        <Button
          label={step.action!}
          loading={busy}
          onPress={() => void run(startDriving)}
        />
      )}
      {trip.status === 'on-the-way' && (
        <Button
          label={step.action!}
          loading={busy}
          onPress={() => void run(pickUp)}
        />
      )}

      {trip.status === 'in-transit' && (
        <View className="gap-3">
          {asset ? (
            <>
              <Image
                accessibilityLabel="The photo you took"
                source={{ uri: asset.uri }}
                style={{ width: '100%', height: 220, borderRadius: 12 }}
                resizeMode="cover"
              />
              <Button
                label="Confirm delivered"
                icon="check"
                loading={busy}
                onPress={() => void confirmDelivered()}
              />
              <Button
                secondary
                icon={null}
                label="Retake photo"
                disabled={busy}
                onPress={() => void takePhoto()}
              />
            </>
          ) : (
            <Button
              label={step.action!}
              icon="image"
              disabled={busy}
              onPress={() => void takePhoto()}
            />
          )}
        </View>
      )}

      {trip.proofPhoto && (
        <View className="gap-2 rounded-[20px] bg-card p-5">
          <Text className="text-xs font-medium tracking-wider text-muted-foreground">
            YOUR PROOF OF DELIVERY
          </Text>
          <ProofPhoto photoKey={trip.proofPhoto} />
        </View>
      )}

      {!!error && <Notice warning>{error}</Notice>}
    </View>
  );
}