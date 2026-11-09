import { Tabs } from 'expo-router';

import { AnimatedTabBar } from '../../components/navigation/AnimatedTabBar';
import { usePalette } from '../../hooks/usePalette';

export default function TabLayout() {
  const palette = usePalette();
  return (
    <Tabs
      // These three small screens retain their native views between tab changes.
      detachInactiveScreens={false}
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: false,
        animation: 'none',
        sceneStyle: { backgroundColor: palette.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="activity" options={{ title: 'Activity' }} />
      <Tabs.Screen name="help" options={{ title: 'Help' }} />
    </Tabs>
  );
}
