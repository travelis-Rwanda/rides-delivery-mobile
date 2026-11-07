# rides-delivery-mobile

Expo mobile app using NativeWind 4 and Tailwind CSS 3.

## Styling

The approved Rides light and dark palettes live in `src/constants/colors.js`.
`tailwind.config.js` turns these tokens into CSS variables and semantic utilities.
The app follows the device's light/dark appearance automatically. On iOS,
primary/tint/star, warning, destructive, and accent foreground use Apple system
colors; Android and web use the supplied hex values. Brand success green stays
separate from system green. Muted tokens retain their supplied alpha values.

```tsx
<View className="flex-1 bg-background p-6">
  <View className="rounded-2xl border border-border bg-card p-4">
    <Text className="text-lg font-bold text-foreground">Delivery details</Text>
    <Text className="text-muted-foreground">Your delivery updates</Text>
    <Text className="text-primary">View delivery</Text>
    <Text className="bg-success-muted text-success">Delivered</Text>
  </View>
</View>
```

Other tokens include `secondary`, `accent`, `warning`, `destructive`, `input`,
`surface`, and foreground variants such as `text-primary-foreground`.
Aliases include `tint`, `star`, `brand-green`, `surface-alt`, and `system-blue`.
Opaque colors support opacity modifiers, for example `bg-primary/50` on Android
and web. Use the explicit muted tokens for the approved translucent colors.

After changing Babel, Metro, or theme configuration, restart Metro with:

```sh
npm start -- --clear
```

Rebuild an existing development client after adding native dependencies.

## Checks

```sh
npm run lint
npm run typecheck
```

Setup follows the [NativeWind installation guide](https://www.nativewind.dev/docs/getting-started/installation).
