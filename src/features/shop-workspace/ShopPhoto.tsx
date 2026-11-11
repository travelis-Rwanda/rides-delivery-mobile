import { ConfirmRemoveButton } from '../../components/ui/ConfirmRemoveButton';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon } from '../../components/ui/Icon';
import { Button } from '../../components/ui/primitives';
import { ScrollPressable } from '../../components/ui/ScrollInteraction';
import { Text } from '../../components/ui/Text';
import { usePalette } from '../../hooks/usePalette';
import { CatalogImage } from '../merchants/components/CatalogImage';
import { makePhotoKey, type OpenedPhoto } from './photoAsset';
import { deleteShopPhoto, openShopPhoto, saveShopPhoto } from './photoStorage';
import { ShopPanel, ShopSection } from './ui';

function useStoredPhoto(photoKey?: string) {
  const [photo, setPhoto] = useState<{ key: string; uri?: string }>();
  useEffect(() => {
    if (!photoKey) return;
    let disposed = false;
    let opened: OpenedPhoto | undefined;
    void openShopPhoto(photoKey)
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

export function ShopPhoto({
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
  const uri = useStoredPhoto(photoKey);
  return (
    <CatalogImage
      imageKey={imageKey}
      imageUri={uri ?? imageUri}
      previewLabel={label}
      style={style}
    />
  );
}

export function useShopPhotoDraft(photoKey?: string) {
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
      if (asset) created = await saveShopPhoto(asset);
      const key = created ?? (removed ? undefined : photoKey);
      committed = await persist(key);
      if (committed && photoKey && photoKey !== key) {
        void deleteShopPhoto(photoKey).catch(() => {});
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
      if (!committed && created) void deleteShopPhoto(created).catch(() => {});
      writing.current = false;
      setSaving(false);
    }
  }

  return { asset, removed, saving, error, choose, remove, save };
}

export function ShopPhotoEditor({
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
  draft: ReturnType<typeof useShopPhotoDraft>;
  disabled?: boolean;
}) {
  const palette = usePalette();
  const hasPhoto = !!(
    draft.asset ||
    (!draft.removed && (photoKey || imageKey || imageUri))
  );
  return (
    <ShopPanel>
      <ShopSection icon="image" title={title} description={description} />
      {hasPhoto ? (
        <>
          <ShopPhoto
            photoKey={!draft.asset ? photoKey : undefined}
            imageKey={imageKey}
            imageUri={draft.asset?.uri ?? imageUri}
            style={{ height: 170, borderRadius: 14 }}
          />
          <View className="flex-row flex-wrap gap-2">
            <Button
              label="Replace photo"
              icon="image"
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
    </ShopPanel>
  );
}
