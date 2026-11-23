import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';

import { Icon } from '../../../components/ui/Icon';
import { Text } from '../../../components/ui/Text';
import { usePalette } from '../../../hooks/usePalette';
import { openProofPhoto } from '../proofPhoto';

// Shows the photo the driver took of the delivered parcel. If the photo cannot
// be opened, a plain placeholder shows instead, so the screen never breaks.
export function ProofPhoto({ photoKey }: { photoKey: string }) {
  const palette = usePalette();
  const [loaded, setLoaded] = useState<{ key: string; uri?: string }>();

  useEffect(() => {
    let cancelled = false;
    let release: (() => void) | undefined;
    openProofPhoto(photoKey)
      .then((opened) => {
        if (cancelled) {
          opened?.release?.();
          return;
        }
        release = opened?.release;
        setLoaded({ key: photoKey, uri: opened?.uri });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      release?.();
    };
  }, [photoKey]);

  // Only show a photo that belongs to this key, never a stale one.
  const uri = loaded?.key === photoKey ? loaded.uri : undefined;

  if (uri)
    return (
      <Image
        accessibilityLabel="Photo of the delivered parcel"
        source={{ uri }}
        style={{ width: '100%', height: 220, borderRadius: 12 }}
        resizeMode="cover"
      />
    );
  return (
    <View
      accessibilityLabel="Photo of the delivered parcel"
      className="h-32 items-center justify-center rounded-xl bg-muted"
    >
      <Icon name="image" size={28} color={palette.border} />
      <Text className="mt-2 text-xs text-muted-foreground">
        Photo saved with this delivery
      </Text>
    </View>
  );
}