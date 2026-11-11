import { Stack } from 'expo-router';
import { ShopWorkspaceProvider } from '../../features/shop-workspace/ShopWorkspaceProvider';
import { usePalette } from '../../hooks/usePalette';

export default function ShopWorkspaceLayout() {
  const palette = usePalette();
  return (
    <ShopWorkspaceProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.background },
        }}
      />
    </ShopWorkspaceProvider>
  );
}
