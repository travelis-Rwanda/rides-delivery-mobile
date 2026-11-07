import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View } from 'react-native';

import { Icon } from '../../components/ui/Icon';
import { usePalette } from '../../hooks/usePalette';

export default function TabLayout() {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette['muted-foreground'],
        tabBarStyle: {
          backgroundColor: palette.card,
          borderTopColor: palette.border,
          height: 78 + insets.bottom,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 12),
          borderTopWidth: 0.5,
        },
        tabBarLabelStyle: {
          fontFamily: 'Stolzl',
          fontSize: 10,
          fontWeight: '500',
          marginTop: 5,
        },
        tabBarLabelPosition: 'below-icon',
        sceneStyle: { backgroundColor: palette.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View
              className={`h-8 w-12 items-center justify-center rounded-xl ${focused ? 'bg-secondary' : ''}`}
            >
              <Icon name="home" size={21} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color, focused }) => (
            <View
              className={`h-8 w-12 items-center justify-center rounded-xl ${focused ? 'bg-secondary' : ''}`}
            >
              <Icon name="activity" size={21} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="help"
        options={{
          title: 'Help',
          tabBarIcon: ({ color, focused }) => (
            <View
              className={`h-8 w-12 items-center justify-center rounded-xl ${focused ? 'bg-secondary' : ''}`}
            >
              <Icon name="help" size={21} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
