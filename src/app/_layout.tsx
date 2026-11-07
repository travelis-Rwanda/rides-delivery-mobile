import '../../global.css';

import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { colorScheme } from 'nativewind';
import { useEffect } from 'react';
import { Platform, useColorScheme } from 'react-native';

import { DeliveryProvider } from '../features/delivery/DeliveryProvider';
import { usePalette } from '../hooks/usePalette';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const palette = usePalette();
  const systemScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts([
    {
      fontFamily: 'Stolzl',
      fontDefinitions: [
        { path: require('../../assets/fonts/Stolzl-Regular.ttf'), weight: 400 },
        { path: require('../../assets/fonts/Stolzl-Medium.ttf'), weight: 500 },
        { path: require('../../assets/fonts/Stolzl-Bold.ttf'), weight: 700 },
      ],
    },
  ]);
  useEffect(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);
  useEffect(() => {
    // Keep NativeWind's web class in sync without overriding native Appearance.
    if (Platform.OS === 'web') colorScheme.set(systemScheme ?? 'light');
  }, [systemScheme]);
  if (!fontsLoaded && !fontError) return null;
  return (
    <DeliveryProvider>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.background },
        }}
      />
    </DeliveryProvider>
  );
}
