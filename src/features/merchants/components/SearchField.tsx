import { Pressable, TextInput, View } from 'react-native';

import { Icon } from '../../../components/ui/Icon';
import { usePalette } from '../../../hooks/usePalette';

export function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const palette = usePalette();
  return (
    <View className="min-h-14 flex-row items-center gap-3 rounded-[18px] border border-border bg-card pl-4 pr-2">
      <Icon name="search" color={palette['muted-foreground']} size={20} />
      <TextInput
        accessibilityLabel={placeholder}
        placeholder={placeholder}
        placeholderTextColor={palette['muted-foreground']}
        value={value}
        onChangeText={onChange}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        className="min-h-14 flex-1 py-3 text-[13px] text-foreground"
        style={{ fontFamily: 'Stolzl' }}
      />
      {!!value && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          onPress={() => onChange('')}
          className="h-11 w-11 items-center justify-center"
        >
          <Icon name="close" size={17} color={palette.foreground} />
        </Pressable>
      )}
    </View>
  );
}
