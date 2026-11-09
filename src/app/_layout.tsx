import '../../global.css';

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { colorScheme } from 'nativewind';
import { useEffect } from 'react';
import { Appearance, Platform, View, useColorScheme } from 'react-native';

import { colors } from '../constants/colors';
import { DeliveryProvider } from '../features/delivery/DeliveryProvider';
import { usePalette } from '../hooks/usePalette';

void SplashScreen.preventAutoHideAsync();
// Set Android's window/decor background before any screen can transition.
// A navigation theme only paints views inside that native surface.
void SystemUI.setBackgroundColorAsync(
  colors[Appearance.getColorScheme() === 'dark' ? 'dark' : 'light'].background,
);

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
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(palette.background);
  }, [palette.background]);

  const backgroundStyle = { flex: 1, backgroundColor: palette.background };
  if (!fontsLoaded && !fontError) return <View style={backgroundStyle} />;
  const baseTheme = systemScheme === 'dark' ? DarkTheme : DefaultTheme;
  return (
    <View style={backgroundStyle}>
      <ThemeProvider
        value={{
          ...baseTheme,
          colors: {
            ...baseTheme.colors,
            background: palette.background,
            card: palette.card,
            text: palette.foreground,
            border: palette.border,
            primary: palette.primary,
            notification: palette.destructive,
          },
        }}
      >
        <DeliveryProvider>
          <StatusBar style="auto" />
          <Stack
            screenOptions={{
              headerShown: false,
              // Android's default fade can expose the window between screens.
              animation:
                Platform.OS === 'android' ? 'slide_from_right' : 'default',
              contentStyle: { backgroundColor: palette.background },
            }}
          />
        </DeliveryProvider>
      </ThemeProvider>
    </View>
  );
}
