import { ConfirmRemoveButton } from '../../components/ui/ConfirmRemoveButton';
import { useState } from 'react';
import {
  Platform,
  View,
  Image,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef } from 'react';

import { Icon } from '../../components/ui/Icon';
import { Button } from '../../components/ui/primitives';
import { ScrollPressable } from '../../components/ui/ScrollInteraction';
import { Text } from '../../components/ui/Text';
import { usePalette } from '../../hooks/usePalette';
import { CatalogImage } from '../merchants/components/CatalogImage';
import { makePhotoKey, type OpenedPhoto } from './photoAsset';
import {
  deleteRestaurantPhoto,
  openRestaurantPhoto,
  saveRestaurantPhoto,
} from './photoStorage';
import { RestaurantPanel, RestaurantSection } from './ui';

function useStoredPhoto(photoKey?: string) {
  const [photo, setPhoto] = useState<{ key: string; uri?: string }>();
  useEffect(() => {
    if (!photoKey) return;
    let disposed = false;
    let opened: OpenedPhoto | undefined;
    void openRestaurantPhoto(photoKey)
      .then((result) => {
        if (disposed) {
          result?.release?.();
          return;
        }
        opened = result;
        setPhoto({ key: photoKey, uri: result?.uri });
      })
      .catch(() => {
        if (!disposed) setPhoto({ key: photoKey });
      });
    return () => {
      disposed = true;
      opened?.release?.();
    };
  }, [photoKey]);
  return photo?.key === photoKey ? photo?.uri : undefined;
}

export function RestaurantPhoto({
  photoKey,
  imageKey,
  imageUri,
  label,
  style,
}: {
  photoKey?: string;
  imageKey?: string;
  imageUri?: string;
  label?: string;
  style: StyleProp<ViewStyle>;
}) {
  const palette = usePalette();
  const storedUri = useStoredPhoto(photoKey);
  const uri = storedUri ?? imageUri;
  // If we have a live URI (user-picked or stored locally), render it directly.
  if (uri) {
    return (
      <View
        style={[
          {
            overflow: 'hidden',
            backgroundColor: palette.muted,
          },
          style,
        ]}
      >
        <Image
          source={{ uri }}
          resizeMode="cover"
          style={{ width: '100%', height: '100%' }}
          accessible={false}
        />
      </View>
    );
  }
  // Fall back to CatalogImage for bundled asset keys.
  return (
    <CatalogImage imageKey={imageKey} previewLabel={label} style={style} />
  );
}

export function useRestaurantPhotoDraft(photoKey?: string) {
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset>();
  const [removed, setRemoved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const writing = useRef(false);
  const selecting = useRef(false);

  useEffect(() => {
    if (Platform.OS === 'web' && asset?.uri.startsWith('blob:')) {
      return () => URL.revokeObjectURL(asset.uri);
    }
  }, [asset]);

  async function choose() {
    if (selecting.current || writing.current) return;
    selecting.current = true;
    setError('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      });
      if (result.canceled) return;
      const chosen = result.assets[0];
      const size = chosen.file?.size ?? chosen.fileSize;
      try {
        makePhotoKey(chosen, size ?? 1);
        if (!chosen.width || !chosen.height)
          throw new Error('This photo could not be opened.');
      } catch (cause) {
        if (Platform.OS === 'web' && chosen.uri.startsWith('blob:'))
          URL.revokeObjectURL(chosen.uri);
        throw cause;
      }
      setAsset(chosen);
      setRemoved(false);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to select a photo.',
      );
    } finally {
      selecting.current = false;
    }
  }

  function remove() {
    if (writing.current) return;
    setRemoved(true);
    setAsset(undefined);
    setError('');
  }

  async function save(persist: (key?: string) => Promise<boolean>) {
    if (writing.current || selecting.current) return false;
    writing.current = true;
    setSaving(true);
    setError('');
    let created: string | undefined;
    let committed = false;
    try {
      if (asset) created = await saveRestaurantPhoto(asset);
      const key = created ?? (removed ? undefined : photoKey);
      committed = await persist(key);
      if (committed && photoKey && photoKey !== key) {
        void deleteRestaurantPhoto(photoKey).catch(() => {});
      }
      if (committed) {
        setAsset(undefined);
        setRemoved(false);
      }
      return committed;
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'The photo could not be saved.',
      );
      return false;
    } finally {
      if (!committed && created)
        void deleteRestaurantPhoto(created).catch(() => {});
      writing.current = false;
      setSaving(false);
    }
  }

  return { asset, removed, saving, error, choose, remove, save };
}

export function RestaurantPhotoEditor({
  title,
  description,
  photoKey,
  imageKey,
  imageUri,
  draft,
  disabled,
}: {
  title: string;
  description: string;
  photoKey?: string;
  imageKey?: string;
  imageUri?: string;
  draft: ReturnType<typeof useRestaurantPhotoDraft>;
  disabled?: boolean;
}) {
  const palette = usePalette();
  const hasPhoto = !!(
    draft.asset ||
    (!draft.removed && (photoKey || imageKey || imageUri))
  );
  return (
    <RestaurantPanel>
      <RestaurantSection icon="edit" title={title} description={description} />
      {hasPhoto ? (
        <>
          <RestaurantPhoto
            photoKey={!draft.asset ? photoKey : undefined}
            imageKey={imageKey}
            imageUri={draft.asset?.uri ?? imageUri}
            style={{ height: 170, borderRadius: 14 }}
          />
          <View className="flex-row flex-wrap gap-2">
            <Button
              label="Replace photo"
              icon="edit"
              secondary
              disabled={disabled}
              onPress={() => void draft.choose()}
            />
            <ConfirmRemoveButton
              label="Remove photo"
              disabled={disabled}
              description="Remove this photo from the draft? Save your changes to apply the removal."
              onConfirm={draft.remove}
            />
          </View>
        </>
      ) : (
        <ScrollPressable
          accessibilityRole="button"
          accessibilityLabel="Choose photo"
          accessibilityHint="Select a JPG, PNG, or WebP up to 10 MB"
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={() => void draft.choose()}
          className="min-h-[82px] flex-row items-center gap-3 rounded-[14px] border border-dashed border-muted-foreground/75 bg-background/55 p-3"
        >
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-secondary">
            <Icon name="plus" color={palette.primary} size={20} />
          </View>
          <View className="flex-1 gap-1">
            <Text className="text-sm font-medium text-foreground">
              Choose photo
            </Text>
            <Text className="text-xs leading-[18px] text-muted-foreground">
              JPG, PNG or WebP · up to 10 MB
            </Text>
          </View>
        </ScrollPressable>
      )}
      {!!draft.error && (
        <Text accessibilityRole="alert" className="text-xs text-destructive">
          {draft.error}
        </Text>
      )}
    </RestaurantPanel>
  );
}
