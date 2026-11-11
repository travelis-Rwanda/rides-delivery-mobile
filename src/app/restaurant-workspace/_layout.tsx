import { Stack } from 'expo-router';
import { RestaurantWorkspaceProvider } from '../../features/restaurant-workspace/RestaurantWorkspaceProvider';
import { usePalette } from '../../hooks/usePalette';

export default function RestaurantWorkspaceLayout() {
  const palette = usePalette();
  return (
    <RestaurantWorkspaceProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.background },
        }}
      />
    </RestaurantWorkspaceProvider>
  );
}
