import './global.css';

import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';

export default function App() {
  return (
    <View className="flex-1 items-center justify-center bg-background px-6">
      <View className="w-full max-w-md rounded-2xl border border-border bg-card p-6">
        <Text className="text-3xl font-bold text-primary">Rides Delivery</Text>
        <Text className="mt-3 text-base text-muted-foreground">
          Courier, restaurant, and shop delivery.
        </Text>
      </View>
      <StatusBar style="auto" />
    </View>
  );
}
