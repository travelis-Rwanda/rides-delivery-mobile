import { Stack } from 'expo-router';
import { usePalette } from '../../hooks/usePalette';

export default function ShopWorkspaceLayout() {
  const palette = usePalette();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: palette.background },
      }}
    />
  );
}
