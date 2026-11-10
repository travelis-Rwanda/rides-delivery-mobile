import { useState } from 'react';
import {
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../../components/ui/Icon';
import { Text } from '../../../components/ui/Text';
import { usePalette } from '../../../hooks/usePalette';

const photos: Record<string, ImageSourcePropType> = {
  burger: require('../../../../assets/catalog/burger.jpg'),
  bowl: require('../../../../assets/catalog/bowl.jpg'),
  chicken: require('../../../../assets/catalog/chicken.jpg'),
  produce: require('../../../../assets/catalog/produce.jpg'),
  pantry: require('../../../../assets/catalog/pantry.jpg'),
  bread: require('../../../../assets/catalog/bread.jpg'),
  coffee: require('../../../../assets/catalog/coffee.jpg'),
  home: require('../../../../assets/catalog/home.jpg'),
  cleaning: require('../../../../assets/catalog/cleaning.jpg'),
};

export function CatalogImage({
  imageKey,
  style,
  previewLabel,
}: {
  imageKey?: string;
  style?: StyleProp<ViewStyle>;
  previewLabel?: string;
}) {
  const palette = usePalette();
  const [previewOpen, setPreviewOpen] = useState(false);
  const source = imageKey ? photos[imageKey] : undefined;
  const frameStyle: StyleProp<ViewStyle> = [
    {
      overflow: 'hidden',
      backgroundColor: palette.muted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    style,
  ];
  const thumbnail = source ? (
    <Image
      source={source}
      resizeMode="cover"
      style={{ width: '100%', height: '100%' }}
      accessible={false}
    />
  ) : (
    <Icon name="shop" size={26} color={palette['muted-foreground']} />
  );

  if (!source || !previewLabel)
    return <View style={frameStyle}>{thumbnail}</View>;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View photo of ${previewLabel}`}
        onPress={() => {
          Keyboard.dismiss();
          setPreviewOpen(true);
        }}
        style={frameStyle}
      >
        {thumbnail}
      </Pressable>
      {previewOpen && (
        <PhotoViewer
          source={source}
          label={previewLabel}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </>
  );
}

function PhotoViewer({
  source,
  label,
  onClose,
}: {
  source: ImageSourcePropType;
  label: string;
  onClose: () => void;
}) {
  const content = (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: '#090909' }}
      onAccessibilityEscape={onClose}
    >
      <View className="flex-row items-center gap-4 px-5 py-3">
        <Text
          accessibilityRole="header"
          numberOfLines={2}
          className="flex-1 text-base font-medium text-white"
        >
          {label}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close photo"
          onPress={onClose}
          className="h-11 w-11 items-center justify-center rounded-full bg-white/15"
        >
          <Icon name="close" color="#FFFFFF" />
        </Pressable>
      </View>
      <Image
        accessible
        accessibilityLabel={label}
        resizeMode="contain"
        source={source}
        style={{ flex: 1, width: '100%' }}
      />
    </SafeAreaView>
  );

  return (
    <Modal
      visible
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      {Platform.OS === 'web' ? (
        content
      ) : (
        <SafeAreaProvider>{content}</SafeAreaProvider>
      )}
    </Modal>
  );
}
