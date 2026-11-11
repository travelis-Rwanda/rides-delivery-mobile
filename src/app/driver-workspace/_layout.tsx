import { Stack } from 'expo-router';

import { DriverSessionProvider } from '../../features/driver-workspace/DriverSessionProvider';
import { usePalette } from '../../hooks/usePalette';

export default function DriverWorkspaceLayout() {
  const palette = usePalette();
  return (
    <DriverSessionProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.background },
        }}
      />
    </DriverSessionProvider>
  );
}